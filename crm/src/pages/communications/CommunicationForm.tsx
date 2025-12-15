import React from 'react';

const CommunicationForm = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Log Communication</h2>
      <form className="space-y-6">
        {/* Basic Communication Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Communication Type <span className="text-red-500">*</span>
            </label>
            <select
              name="communication_type"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              <option value="email">Email</option>
              <option value="phone">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="video_call">Video Call</option>
              <option value="chat">Chat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Communication Channel <span className="text-red-500">*</span>
            </label>
            <select
              name="communication_channel"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select channel</option>
              <option value="corporate_email">Corporate Email</option>
              <option value="personal_email">Personal Email</option>
              <option value="office_phone">Office Phone</option>
              <option value="mobile_phone">Mobile Phone</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </div>
        </div>

        {/* Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sender <span className="text-red-500">*</span>
            </label>
            <select
              name="sender"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select sender</option>
              <option value="current_user">Current User</option>
              <option value="other_rep">Other Sales Rep</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recipient <span className="text-red-500">*</span>
            </label>
            <select
              name="recipient"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select recipient</option>
              <option value="1">John Doe (Acme Corp)</option>
              <option value="2">Jane Smith (Tech Inc)</option>
            </select>
          </div>
        </div>

        {/* Communication Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Communication Summary <span className="text-red-500">*</span>
          </label>
          <textarea
            name="communication_summary"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Summarize the communication..."
          ></textarea>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Communication Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="communication_date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Duration (minutes)
            </label>
            <input
              type="number"
              name="communication_duration"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="15"
            />
          </div>
        </div>

        {/* Email Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="email_open_tracked"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-blue-500"
            />
            <label className="ml-2 block text-sm text-gray-700">Track Email Opens</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="email_click_tracked"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-blue-500"
            />
            <label className="ml-2 block text-sm text-gray-700">Track Email Clicks</label>
          </div>
        </div>

        {/* Follow-up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Next Follow-up Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="next_followup_date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sentiment Analysis <span className="text-red-500">*</span>
            </label>
            <select
              name="sentiment_analysis"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Attachments</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX up to 10MB</p>
            </div>
          </div>
        </div>



        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Log Communication
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommunicationForm;