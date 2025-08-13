"use client";

import { format } from "date-fns";
import { Order } from "@/types/order";
import { formatAmount } from "@/helpers/formatAmount";

interface InvoiceTemplateProps {
  order: Order;
  className?: string;
}

export function InvoiceTemplate({ order, className = "" }: InvoiceTemplateProps) {
  const businessName = "The Blueplate Restaurant";
  const businessAddress = "123 Restaurant Street, Kaduna, Nigeria";
  const businessPhone = "+234 801 234 5678";
  const businessEmail = "info@blueplate.com";

  return (
    <div className={`max-w-4xl mx-auto bg-white p-8 ${className}`}>
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{businessName}</h1>
            <p className="text-gray-600 mt-2">{businessAddress}</p>
            <p className="text-gray-600">Phone: {businessPhone}</p>
            <p className="text-gray-600">Email: {businessEmail}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
            <p className="text-gray-600 mt-2">Invoice #: {order.invoice_no}</p>
            <p className="text-gray-600">
              Date: {format(new Date(order.order_time), "PPP")}
            </p>
            <p className="text-gray-600">
              Time: {format(new Date(order.order_time), "p")}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Customer Information
          </h3>
          <div className="space-y-1">
            <p className="text-gray-600">
              <span className="font-medium">Name:</span> {order.customer_name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Phone:</span> {order.customer_phone}
            </p>
            {order.customer_address && (
              <p className="text-gray-600">
                <span className="font-medium">Address:</span>{" "}
                {order.customer_address}
              </p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Order Details
          </h3>
          <div className="space-y-1">
            <p className="text-gray-600">
              <span className="font-medium">Order Type:</span>{" "}
              {order.dining_option === "indoor" ? "Dine-in" : "Delivery"}
            </p>
            {order.table && (
              <p className="text-gray-600">
                <span className="font-medium">Table:</span>{" "}
                Table {order.table.table_number}
              </p>
            )}
            {order.delivery_location && (
              <p className="text-gray-600">
                <span className="font-medium">Delivery Location:</span>{" "}
                {order.delivery_location.name}
              </p>
            )}
            {order.rider_name && (
              <p className="text-gray-600">
                <span className="font-medium">Rider:</span> {order.rider_name} -{" "}
                {order.rider_phone}
              </p>
            )}
            <p className="text-gray-600">
              <span className="font-medium">Payment Method:</span>{" "}
              {order.payment_method.charAt(0).toUpperCase() +
                order.payment_method.slice(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Order Items
        </h3>
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items?.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.menu_item_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatAmount(item.menu_item_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatAmount(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Summary */}
      <div className="flex justify-end">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatAmount(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (7.5%):</span>
              <span className="font-medium">{formatAmount(order.vat_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service Charge (2.5%):</span>
              <span className="font-medium">
                {formatAmount(order.service_charge)}
              </span>
            </div>
            {order.takeaway_packs > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Takeaway Packs (x{order.takeaway_packs}):
                </span>
                <span className="font-medium">
                  {formatAmount(order.takeaway_packs * order.takeaway_pack_price)}
                </span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee:</span>
                <span className="font-medium">
                  {formatAmount(order.delivery_fee)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatAmount(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      {order.payment && (
        <div className="mt-6 pt-6 border-t border-gray-300">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Payment Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                order.payment.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {order.payment.status.charAt(0).toUpperCase() +
                order.payment.status.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mt-6 pt-6 border-t border-gray-300">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Notes:</h4>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">
          For any questions, please contact us at {businessPhone}
        </p>
      </div>
    </div>
  );
} 