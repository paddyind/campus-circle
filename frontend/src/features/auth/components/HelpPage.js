import React from 'react';

const HelpPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Help & Support</h1>

      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dummy Login Credentials</h2>
        <p className="text-gray-600 mb-6">
          For testing purposes, you can use the following dummy credentials to log in as a Parent or a Student.
          These will be removed in a future update.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parent Login */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Parent Login</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> parent@test.com</p>
              <p><strong>Password:</strong> password123</p>
            </div>
          </div>

          {/* Student Login */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Student Login</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> student@test.com</p>
              <p><strong>Password:</strong> password123</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800">How do I register for an event?</h4>
              <p className="text-gray-600">Navigate to the event details page and click the "Register" button. If the event requires payment, you will be redirected to a secure payment gateway.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Where can I see my registered events?</h4>
              <p className="text-gray-600">Once logged in, you can view all your registered events under the "My Events" menu.</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Support</h2>
          <p className="text-gray-600">
            If you need further assistance, please do not hesitate to reach out to our support team at <a href="mailto:support@campuscircle.com" className="text-indigo-600 hover:underline">support@campuscircle.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
