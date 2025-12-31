import React from 'react';

const AboutPage = () => {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">About Us</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to CampusCircle
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Connecting schools, parents, and students for a vibrant campus community.
          </p>
        </div>
      </div>
      <div className="py-16 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Our Mission</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
              To provide a seamless platform for managing campus events, fostering communication, and enhancing engagement within the school community.
            </p>
          </div>
        </div>
      </div>
      <div className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Our Team</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
              We are a passionate team of educators, developers, and designers dedicated to improving the school experience for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
