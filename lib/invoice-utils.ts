import { Order } from "@/types/order";

/**
 * Print an invoice for the given order
 */
export function printInvoice(order: Order) {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      throw new Error('Failed to open print window - popup blocked');
    }

    // Helper function to safely format payment method
    const formatPaymentMethod = (method: string | undefined) => {
      if (!method) return 'Not specified';
      return method.charAt(0).toUpperCase() + method.slice(1);
    };

    // Helper function to safely format date
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleDateString('en-NG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return 'Invalid date';
      }
    };

    // Helper function to safely format time
    const formatTime = (dateString: string | undefined) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleTimeString('en-NG', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch {
        return 'Invalid time';
      }
    };

    // Helper function to safely format currency
    const formatCurrency = (amount: number | undefined) => {
      if (amount === undefined || amount === null) return '₦0';
      return `₦${amount.toLocaleString()}`;
    };

    // Create the HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.invoice_no || 'Unknown'}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .header {
              border-bottom: 2px solid #ccc;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .business-info h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .business-info p {
              margin: 5px 0;
              color: #6b7280;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-info h2 {
              font-size: 20px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .invoice-info p {
              margin: 5px 0;
              color: #6b7280;
            }
            .customer-order-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 20px;
            }
            .section h3 {
              font-size: 16px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .section p {
              margin: 5px 0;
              color: #6b7280;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background-color: #f9fafb;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table th:last-child,
            .items-table td:last-child {
              text-align: right;
            }
            .items-table th:nth-child(2),
            .items-table td:nth-child(2) {
              text-align: center;
            }
            .summary {
              text-align: right;
              width: 320px;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .summary-total {
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              font-weight: bold;
              font-size: 18px;
            }
            .payment-status {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .status-badge {
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
            }
            .status-completed {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .notes {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div class="business-info">
                <h1>The Blueplate Restaurant</h1>
                <p>123 Restaurant Street, Kaduna, Nigeria</p>
                <p>Phone: +234 801 234 5678</p>
                <p>Email: info@blueplate.com</p>
              </div>
              <div class="invoice-info">
                <h2>INVOICE</h2>
                <p>Invoice #: ${order.invoice_no || 'Unknown'}</p>
                <p>Date: ${formatDate(order.order_time)}</p>
                <p>Time: ${formatTime(order.order_time)}</p>
              </div>
            </div>
          </div>

          <div class="customer-order-grid">
            <div class="section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${order.customer_name || 'Not specified'}</p>
              <p><strong>Phone:</strong> ${order.customer_phone || 'Not specified'}</p>
              ${order.customer_address ? `<p><strong>Address:</strong> ${order.customer_address}</p>` : ''}
            </div>
            <div class="section">
              <h3>Order Details</h3>
              <p><strong>Order Type:</strong> ${order.dining_option === 'indoor' ? 'Dine-in' : 'Delivery'}</p>
              ${order.table ? `<p><strong>Table:</strong> Table ${order.table.table_number}</p>` : ''}
              ${order.delivery_location ? `<p><strong>Delivery Location:</strong> ${order.delivery_location.name}</p>` : ''}
              ${order.rider_name ? `<p><strong>Rider:</strong> ${order.rider_name} - ${order.rider_phone || ''}</p>` : ''}
              <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.payment_method)}</p>
            </div>
          </div>

          <div>
            <h3>Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map(item => `
                  <tr>
                    <td>${item.menu_item_name || 'Unknown Item'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${formatCurrency(item.menu_item_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" style="text-align: center;">No items found</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>VAT (7.5%):</span>
              <span>${formatCurrency(order.vat_amount)}</span>
            </div>
            <div class="summary-row">
              <span>Service Charge (2.5%):</span>
              <span>${formatCurrency(order.service_charge)}</span>
            </div>
            ${(order.takeaway_packs || 0) > 0 ? `
              <div class="summary-row">
                <span>Takeaway Packs (x${order.takeaway_packs}):</span>
                <span>${formatCurrency((order.takeaway_packs || 0) * (order.takeaway_pack_price || 0))}</span>
              </div>
            ` : ''}
            ${(order.delivery_fee || 0) > 0 ? `
              <div class="summary-row">
                <span>Delivery Fee:</span>
                <span>${formatCurrency(order.delivery_fee)}</span>
              </div>
            ` : ''}
            <div class="summary-row summary-total">
              <span>Total:</span>
              <span>${formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          ${order.payment ? `
            <div class="payment-status">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Payment Status:</span>
                <span class="status-badge ${order.payment.status === 'completed' ? 'status-completed' : 'status-pending'}">
                  ${order.payment.status ? (order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)) : 'Unknown'}
                </span>
              </div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="notes">
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #1f2937;">Notes:</h4>
              <p style="margin: 0; color: #6b7280;">${order.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any questions, please contact us at +234 801 234 5678</p>
          </div>
        </body>
      </html>
    `;

    // Write the content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after a delay to allow printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }
    }, 1000);

  } catch (error) {
    console.error('Print error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Failed to open print dialog - ' + errorMessage);
  }
}

/**
 * Download an invoice as PDF (using browser's print to PDF functionality)
 */
export function downloadInvoiceAsPDF(order: Order) {
  try {
    // Create a new window for PDF generation
    const pdfWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (!pdfWindow) {
      throw new Error('Failed to open PDF window - popup blocked');
    }

    // Helper function to safely format payment method
    const formatPaymentMethod = (method: string | undefined) => {
      if (!method) return 'Not specified';
      return method.charAt(0).toUpperCase() + method.slice(1);
    };

    // Helper function to safely format date
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleDateString('en-NG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return 'Invalid date';
      }
    };

    // Helper function to safely format time
    const formatTime = (dateString: string | undefined) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleTimeString('en-NG', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch {
        return 'Invalid time';
      }
    };

    // Helper function to safely format currency
    const formatCurrency = (amount: number | undefined) => {
      if (amount === undefined || amount === null) return '₦0';
      return `₦${amount.toLocaleString()}`;
    };

    // Create the HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.invoice_no || 'Unknown'}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .header {
              border-bottom: 2px solid #ccc;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .business-info h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .business-info p {
              margin: 5px 0;
              color: #6b7280;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-info h2 {
              font-size: 20px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .invoice-info p {
              margin: 5px 0;
              color: #6b7280;
            }
            .customer-order-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 20px;
            }
            .section h3 {
              font-size: 16px;
              margin: 0 0 10px 0;
              color: #1f2937;
            }
            .section p {
              margin: 5px 0;
              color: #6b7280;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background-color: #f9fafb;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table th:last-child,
            .items-table td:last-child {
              text-align: right;
            }
            .items-table th:nth-child(2),
            .items-table td:nth-child(2) {
              text-align: center;
            }
            .summary {
              text-align: right;
              width: 320px;
              margin-left: auto;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .summary-total {
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              font-weight: bold;
              font-size: 18px;
            }
            .payment-status {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .status-badge {
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
            }
            .status-completed {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .notes {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div class="business-info">
                <h1>The Blueplate Restaurant</h1>
                <p>123 Restaurant Street, Kaduna, Nigeria</p>
                <p>Phone: +234 801 234 5678</p>
                <p>Email: info@blueplate.com</p>
              </div>
              <div class="invoice-info">
                <h2>INVOICE</h2>
                <p>Invoice #: ${order.invoice_no || 'Unknown'}</p>
                <p>Date: ${formatDate(order.order_time)}</p>
                <p>Time: ${formatTime(order.order_time)}</p>
              </div>
            </div>
          </div>

          <div class="customer-order-grid">
            <div class="section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${order.customer_name || 'Not specified'}</p>
              <p><strong>Phone:</strong> ${order.customer_phone || 'Not specified'}</p>
              ${order.customer_address ? `<p><strong>Address:</strong> ${order.customer_address}</p>` : ''}
            </div>
            <div class="section">
              <h3>Order Details</h3>
              <p><strong>Order Type:</strong> ${order.dining_option === 'indoor' ? 'Dine-in' : 'Delivery'}</p>
              ${order.table ? `<p><strong>Table:</strong> Table ${order.table.table_number}</p>` : ''}
              ${order.delivery_location ? `<p><strong>Delivery Location:</strong> ${order.delivery_location.name}</p>` : ''}
              ${order.rider_name ? `<p><strong>Rider:</strong> ${order.rider_name} - ${order.rider_phone || ''}</p>` : ''}
              <p><strong>Payment Method:</strong> ${formatPaymentMethod(order.payment_method)}</p>
            </div>
          </div>

          <div>
            <h3>Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map(item => `
                  <tr>
                    <td>${item.menu_item_name || 'Unknown Item'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${formatCurrency(item.menu_item_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" style="text-align: center;">No items found</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>VAT (7.5%):</span>
              <span>${formatCurrency(order.vat_amount)}</span>
            </div>
            <div class="summary-row">
              <span>Service Charge (2.5%):</span>
              <span>${formatCurrency(order.service_charge)}</span>
            </div>
            ${(order.takeaway_packs || 0) > 0 ? `
              <div class="summary-row">
                <span>Takeaway Packs (x${order.takeaway_packs}):</span>
                <span>${formatCurrency((order.takeaway_packs || 0) * (order.takeaway_pack_price || 0))}</span>
              </div>
            ` : ''}
            ${(order.delivery_fee || 0) > 0 ? `
              <div class="summary-row">
                <span>Delivery Fee:</span>
                <span>${formatCurrency(order.delivery_fee)}</span>
              </div>
            ` : ''}
            <div class="summary-row summary-total">
              <span>Total:</span>
              <span>${formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          ${order.payment ? `
            <div class="payment-status">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Payment Status:</span>
                <span class="status-badge ${order.payment.status === 'completed' ? 'status-completed' : 'status-pending'}">
                  ${order.payment.status ? (order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)) : 'Unknown'}
                </span>
              </div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="notes">
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #1f2937;">Notes:</h4>
              <p style="margin: 0; color: #6b7280;">${order.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any questions, please contact us at +234 801 234 5678</p>
          </div>
        </body>
      </html>
    `;

    // Write the content to the new window
    pdfWindow.document.write(htmlContent);
    pdfWindow.document.close();

    // Wait for content to load, then trigger PDF save
    pdfWindow.onload = () => {
      setTimeout(() => {
        pdfWindow.print();
        // Close window after a delay to allow PDF generation
        setTimeout(() => {
          pdfWindow.close();
        }, 1000);
      }, 500);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (pdfWindow.document.readyState === 'complete') {
        pdfWindow.print();
        setTimeout(() => {
          pdfWindow.close();
        }, 1000);
      }
    }, 1000);

  } catch (error) {
    console.error('PDF download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Failed to download PDF - ' + errorMessage);
  }
}

/**
 * Download invoice data as JSON
 */
export function downloadInvoiceAsJSON(order: Order) {
  const dataStr = JSON.stringify(order, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `invoice-${order.invoice_no || 'unknown'}.json`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

/**
 * Download invoice data as CSV
 */
export function downloadInvoiceAsCSV(order: Order) {
  const csvData = [
    ['Invoice Number', order.invoice_no || 'Unknown'],
    ['Order Date', order.order_time ? new Date(order.order_time).toLocaleDateString() : 'Unknown'],
    ['Customer Name', order.customer_name || 'Unknown'],
    ['Customer Phone', order.customer_phone || 'Unknown'],
    ['Customer Address', order.customer_address || ''],
    ['Order Type', order.dining_option || 'Unknown'],
    ['Payment Method', order.payment_method || 'Unknown'],
    ['Subtotal', `₦${(order.subtotal || 0).toLocaleString()}`],
    ['VAT (7.5%)', `₦${(order.vat_amount || 0).toLocaleString()}`],
    ['Service Charge (2.5%)', `₦${(order.service_charge || 0).toLocaleString()}`],
    ['Total Amount', `₦${(order.total_amount || 0).toLocaleString()}`],
    ['Status', order.status || 'Unknown'],
    ['', ''],
    ['Item Name', 'Quantity', 'Unit Price', 'Total Price'],
    ...(order.items?.map(item => [
      item.menu_item_name || 'Unknown Item',
      (item.quantity || 0).toString(),
      `₦${(item.menu_item_price || 0).toLocaleString()}`,
      `₦${(item.total_price || 0).toLocaleString()}`
    ]) || [])
  ];

  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `invoice-${order.invoice_no || 'unknown'}.csv`;
  link.click();
  
  URL.revokeObjectURL(link.href);
} 