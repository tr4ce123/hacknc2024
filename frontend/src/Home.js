import React, { useState, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import { supabase } from "./supabaseClient";
import axios from "axios";
import boltLogo from "./assets/lightningBolt.png";


const backendURL = process.env.REACT_APP_BACKEND_URL;

function Home() {
  const [vods, setVods] = useState([
    {
      id: 1,
      title: "VOD 1",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
    { id: 2, title: "VOD 2", url: "https://www.w3schools.com/html/movie.mp4" },
    {
      id: 3,
      title: "VOD 3",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVodTitle, setNewVodTitle] = useState("");
  const [newVodFile, setNewVodFile] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(vods[0].url);
  const videoRef = useRef(null);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const changeVideo = (url) => {
    setCurrentVideoUrl(url);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const seekToTimestamp = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleAddVod = async (e) => {
    e.preventDefault();
    if (newVodTitle && newVodFile) {
      const newVod = {
        id: vods.length + 1,
        title: newVodTitle,
        url: URL.createObjectURL(newVodFile),
      };

      const user_id = await supabase.auth.getSession().then(({data, error}) => {
        return data.session.user.id;
      })
      const response = await axios.post(`${backendURL}/add-vod`, {
        id: user_id,
        title: newVod.title,
        video_url: newVod.url.split("blob:")[1],
      })
      setVods([...vods, newVod]);
      setCurrentVideoUrl(newVod.url);
      setIsModalOpen(false);
      setNewVodTitle("");
      setNewVodFile(null);
    }
  };

  return (
    <div className="flex h-screen bg-yellow-50">
      {/* Left Sidebar (VODs) */}
      <div className="w-1/4 p-4 bg-yellow-100 border-r border-yellow-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-900">VODs</h2>
          <button
            onClick={toggleModal}
            className="text-yellow-900 hover:text-yellow-600"
          >
            <FaPlus size={20} />
          </button>
        </div>
        <ul className="space-y-2">
          {vods.map((vod) => (
            <li
              key={vod.id}
              className={`p-2 rounded shadow cursor-pointer hover:bg-yellow-200 ${
                vod.url === currentVideoUrl ? "bg-yellow-300" : "bg-white"
              }`}
              onClick={() => changeVideo(vod.url)}
            >
              {vod.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Video Player (Center) */}
      <div className="w-2/4 flex flex-col items-center">
        <img src={boltLogo} alt="Bolt Logo" className="w-24 h-24 mb-4" />
        <div className="w-3/4 h-3/4 bg-black rounded-lg shadow-lg overflow-hidden border border-gray-300">
          <video
            key={currentVideoUrl}
            ref={videoRef}
            src={currentVideoUrl}
            controls
            className="w-full h-full rounded-lg"
          />
        </div>
      </div>

      {/* Right Sidebar (Notes) */}
      <div className="w-1/4 p-4 bg-yellow-100 border-l border-yellow-300 notes">
        <h2 className="text-xl font-semibold mb-4 text-yellow-900">Notes</h2>
        <div className="space-y-2 text-yellow-900">
          <ul className="list-disc list-inside">
            <li>
              Summarizes lectures to <strong>quickly learn material</strong>.
            </li>
            <li>
              Summarizes work meetings to{" "}
              <strong>easily define responsibilities</strong>.
            </li>
            <li>
              Timestamps for key points in meeting:
              <ul className="pl-6" style={{ listStyleType: "square" }}>
                <li>
                  <span
                    onClick={() => seekToTimestamp(10)}
                    className="text-blue-600 cursor-pointer hover:underline"
                  >
                    Can be clicked to immediately jump user to that point in the
                    meeting
                  </span>
                </li>
              </ul>
            </li>
            <li>Full tool for video analysis.</li>
          </ul>
        </div>
      </div>

      {/* Modal for Adding New VOD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-1/3 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-yellow-900">
              Add New VOD
            </h3>
            <form onSubmit={handleAddVod}>
              <div className="mb-4">
                <label className="block text-yellow-800 mb-1">VOD Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-yellow-300 rounded bg-white"
                  placeholder="Enter title"
                  value={newVodTitle}
                  onChange={(e) => setNewVodTitle(e.target.value)}
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
                  onChange={(e) => setNewVodFile(e.target.files[0])}
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
