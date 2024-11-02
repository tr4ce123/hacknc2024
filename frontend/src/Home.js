// src/Home.js
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";

function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to toggle modal
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="flex h-screen bg-yellow-50">
      {/* Left Sidebar (VODs) */}
      <div className="w-1/4 p-4 bg-yellow-100 border-r border-yellow-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-900">VODs</h2>
          {/* "+" Button to open modal */}
          <button
            onClick={toggleModal}
            className="text-yellow-900 hover:text-yellow-600"
          >
            <FaPlus size={20} />
          </button>
        </div>
        {/* Sort and Search Placeholder */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search VODs"
            className="w-full px-3 py-2 border border-yellow-300 rounded mb-2"
          />
          <button className="w-full py-2 bg-yellow-200 text-yellow-900 rounded hover:bg-yellow-300">
            Sort by Date/Time
          </button>
        </div>
        {/* List of VODs */}
        <ul className="space-y-2">
          <li className="p-2 bg-white rounded shadow">VOD 1</li>
          <li className="p-2 bg-white rounded shadow">VOD 2</li>
          <li className="p-2 bg-white rounded shadow">VOD 3</li>
        </ul>
      </div>

      {/* Video Player (Center) */}
      <div className="w-2/4 flex items-center justify-center bg-yellow-50">
        <div className="w-3/4 h-3/4 bg-black flex items-center justify-center rounded">
          {/* Placeholder for video player */}
          <span className="text-white text-lg">Video Player</span>
        </div>
      </div>

      {/* Right Sidebar (Notes) */}
      <div className="w-1/4 p-4 bg-yellow-100 border-l border-yellow-300">
        <h2 className="text-xl font-semibold mb-4 text-yellow-900">Notes</h2>
        {/* List of Notes */}
        <ul className="space-y-2">
          <li className="p-2 bg-white rounded shadow">Note 1</li>
          <li className="p-2 bg-white rounded shadow">Note 2</li>
          <li className="p-2 bg-white rounded shadow">Note 3</li>
        </ul>
      </div>

      {/* Modal for Adding New VOD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-1/3 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-yellow-900">
              Add New VOD
            </h3>
            <form>
              <div className="mb-4">
                <label className="block text-yellow-800 mb-1">VOD Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-yellow-300 rounded"
                  placeholder="Enter title"
                />
              </div>
              <div className="mb-4">
                <label className="block text-yellow-800 mb-1">
                  Upload MP4 File
                </label>
                <input
                  type="file"
                  accept="video/mp4"
                  className="w-full px-3 py-2 border border-yellow-300 rounded"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="px-4 py-2 bg-gray-200 text-yellow-900 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-300 text-yellow-900 rounded hover:bg-yellow-400"
                >
                  Add VOD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
