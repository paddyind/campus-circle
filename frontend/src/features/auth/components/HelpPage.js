import React from 'react';
import { getTenantSlug } from '../../../api/client';

// Feature flag to show/hide test credentials (set to false for production)
const SHOW_TEST_CREDENTIALS = process.env.REACT_APP_SHOW_TEST_CREDENTIALS !== 'false';

// Tenant-specific demo credentials (per TENANTS_AND_DEPLOYMENT / setup-test-users)
const TENANT_CREDENTIALS = {
  'demo-circle': {
    parent: { email: 'demo_parent@campuscircle.com', password: 'password123' },
    student: { email: 'demo_student@campuscircle.com', password: 'password123' },
    admin: { email: 'demo_admin@campuscircle.com', password: 'password123' },
  },
  'demo-bhis': {
    parent: { email: 'bhis_parent@campuscircle.com', password: 'password123' },
    student: { email: 'bhis_student@campuscircle.com', password: 'password123' },
    admin: { email: 'bhis_admin@campuscircle.com', password: 'password123' },
  },
};

const getCredentials = () => {
  const slug = (getTenantSlug() || 'demo-circle').toLowerCase();
  return TENANT_CREDENTIALS[slug] || TENANT_CREDENTIALS['demo-circle'];
};

const HelpPage = () => {
  const creds = getCredentials();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Help & Support</h1>

      <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
        {SHOW_TEST_CREDENTIALS && (
          <>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Test Login Credentials</h2>
            <p className="text-gray-600 mb-6">
              For testing purposes, you can use the following test credentials to log in as a Parent, Student, or Admin in this tenant.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Parent Login */}
              <div className="border border-gray-200 rounded-lg p-6 bg-blue-50 min-w-0 overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Parent Login</h3>
                <div className="space-y-2 text-gray-700 break-words">
                  <p><strong>Email:</strong> <span className="break-all">{creds.parent.email}</span></p>
                  <p><strong>Password:</strong> {creds.parent.password}</p>
                </div>
              </div>

              {/* Student Login */}
              <div className="border border-gray-200 rounded-lg p-6 bg-green-50 min-w-0 overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Student Login</h3>
                <div className="space-y-2 text-gray-700 break-words">
                  <p><strong>Email:</strong> <span className="break-all">{creds.student.email}</span></p>
                  <p><strong>Password:</strong> {creds.student.password}</p>
                </div>
              </div>

              {/* Admin Login */}
              <div className="border border-gray-200 rounded-lg p-6 bg-purple-50 min-w-0 overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Admin Login</h3>
                <div className="space-y-2 text-gray-700 break-words">
                  <p><strong>Email:</strong> <span className="break-all">{creds.admin.email}</span></p>
                  <p><strong>Password:</strong> {creds.admin.password}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">How do I register for an event?</h4>
              <p className="text-gray-600">Navigate to the "Events" page, browse available events, and click "Register" on any event you're interested in. You must be logged in to register.</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">Where can I see my registered events?</h4>
              <p className="text-gray-600">Once logged in, you can view all your registered events under the "My Events" menu. This includes both upcoming and past events you've registered for.</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">How do I update my profile information?</h4>
              <p className="text-gray-600">Go to your Profile page (click on your name in the navigation bar) and click "Edit Profile" to update your information.</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">Can parents register their children for events?</h4>
              <p className="text-gray-600">Parents can view events and manage their children's profiles. Children need to register for events using their own student accounts.</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">What if an event is full?</h4>
              <p className="text-gray-600">If an event has reached its registration limit, you'll see "Event Full" and the registration button will be disabled. You can still view event details.</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">How do I submit feedback or report an issue?</h4>
              <p className="text-gray-600">Use the "Contact Us" page to submit feedback, complaints, or suggestions. You can also relate your submission to a specific event if needed.</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Need More Help?</h2>
          <p className="text-gray-600 mb-4">
            If you need further assistance, please use the <a href="/contact" className="text-indigo-600 hover:underline font-semibold">Contact Us</a> form to submit your inquiry.
          </p>
          <p className="text-gray-600">
            You can also reach out to our support team at <a href="mailto:support@campuscircle.com" className="text-indigo-600 hover:underline">support@campuscircle.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
