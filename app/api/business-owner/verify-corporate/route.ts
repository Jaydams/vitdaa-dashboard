import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VFDAPI, VFDUtils } from '@/lib/vfd-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { businessId, rcNumber, companyName, incorporationDate, directorBVN } = await request.json();

    // Validate input
    if (!businessId || !rcNumber || !companyName || !incorporationDate || !directorBVN) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate BVN format
    if (!VFDUtils.validateBVN(directorBVN)) {
      return NextResponse.json(
        { error: 'Invalid BVN format' },
        { status: 400 }
      );
    }

    // Validate RC Number format
    if (!VFDUtils.validateRCNumber(rcNumber)) {
      return NextResponse.json(
        { error: 'Invalid RC Number format. Must be in format RC-XXXXXXXX' },
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

    // Check if already verified
    if (business.corporate_verified) {
      return NextResponse.json(
        { error: 'Business already verified' },
        { status: 400 }
      );
    }

    // Update business with corporate details
    const { error: updateError } = await supabase
      .from('business_owner')
      .update({
        rc_number: rcNumber,
        incorporation_date: incorporationDate,
        director_bvn: directorBVN,
        corporate_wallet_status: 'pending_verification',
      })
      .eq('id', businessId);

    if (updateError) {
      console.error('Error updating business:', updateError);
      return NextResponse.json(
        { error: 'Failed to update business details' },
        { status: 500 }
      );
    }

    // Create corporate account with VFD
    try {
      const vfdResponse = await VFDAPI.createCorporateAccount(
        rcNumber,
        companyName,
        incorporationDate,
        directorBVN
      );

      if (vfdResponse.status === '00') {
        // Update business with VFD account details
        const { error: vfdUpdateError } = await supabase
          .from('business_owner')
          .update({
            vfd_corporate_account_number: vfdResponse.data?.accountNo,
            vfd_corporate_account_name: vfdResponse.data?.accountName,
            corporate_wallet_status: 'verified',
            corporate_verified: true,
          })
          .eq('id', businessId);

        if (vfdUpdateError) {
          console.error('Error updating VFD account details:', vfdUpdateError);
        }

        // Create business wallet record
        await supabase
          .from('business_wallets')
          .insert({
            business_id: businessId,
            vfd_account_number: vfdResponse.data?.accountNo,
            vfd_account_name: vfdResponse.data?.accountName,
            wallet_status: 'active',
          });

        return NextResponse.json({
          success: true,
          message: 'Corporate account created successfully',
          data: {
            accountNumber: vfdResponse.data?.accountNo,
            accountName: vfdResponse.data?.accountName,
          },
        });
      } else {
        // Update status to failed
        await supabase
          .from('business_owner')
          .update({
            corporate_wallet_status: 'uninitialized',
          })
          .eq('id', businessId);

        return NextResponse.json(
          { 
            error: 'Failed to create corporate account',
            details: vfdResponse.message 
          },
          { status: 400 }
        );
      }
    } catch (vfdError) {
      console.error('VFD API Error:', vfdError);
      
      // Update status to failed
      await supabase
        .from('business_owner')
        .update({
          corporate_wallet_status: 'uninitialized',
        })
        .eq('id', businessId);

      return NextResponse.json(
        { 
          error: 'Failed to create corporate account',
          details: vfdError instanceof Error ? vfdError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in verify-corporate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 