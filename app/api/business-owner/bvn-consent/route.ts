import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VFDAPI, VFDUtils } from '@/lib/vfd-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { businessId, bvn, reference } = await request.json();

    // Validate input
    if (!businessId || !bvn) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate BVN format
    if (!VFDUtils.validateBVN(bvn)) {
      return NextResponse.json(
        { error: 'Invalid BVN format' },
        { status: 400 }
      );
    }

    // Check if business exists
    const { data: business, error: businessError } = await supabase
      .from('business_owner')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check BVN consent with VFD
    try {
      const consentReference = reference || VFDUtils.generateReference('BVN-CONSENT');
      const vfdResponse = await VFDAPI.checkBVNConsent(bvn, '02', consentReference);

      if (vfdResponse.status === '00') {
        const consentData = vfdResponse.data;
        
        if (consentData.statusCode === 'true') {
          // Consent already given
          const { error: updateError } = await supabase
            .from('business_owner')
            .update({
              bvn_verified: true,
              corporate_wallet_status: 'verified',
            })
            .eq('id', businessId);

          if (updateError) {
            console.error('Error updating business BVN status:', updateError);
          }

          return NextResponse.json({
            success: true,
            message: 'BVN consent already given',
            data: {
              consentGiven: true,
              reference: consentData.reference,
            },
          });
        } else {
          // Consent not given, return URL for consent
          return NextResponse.json({
            success: true,
            message: 'BVN consent required',
            data: {
              consentGiven: false,
              consentUrl: consentData.url,
              reference: consentData.reference,
            },
          });
        }
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to check BVN consent',
            details: vfdResponse.message 
          },
          { status: 400 }
        );
      }
    } catch (vfdError) {
      console.error('VFD API Error:', vfdError);
      return NextResponse.json(
        { 
          error: 'Failed to check BVN consent',
          details: vfdError instanceof Error ? vfdError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in bvn-consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 