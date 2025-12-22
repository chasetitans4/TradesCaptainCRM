import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { invoice_id?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>

        <p className="text-gray-600 mb-6">
          Thank you for your payment. A receipt has been sent to your email.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500">
            Your payment has been processed and your invoice has been updated.
          </p>
        </div>

        <p className="text-sm text-gray-400">
          You can close this window now.
        </p>
      </div>
    </div>
  );
}
