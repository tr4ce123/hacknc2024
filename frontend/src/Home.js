import React, { useState, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import axios from "axios";
import boltLogo from "./assets/lightningBolt.png";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";


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
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const toggleSignOutModal = () => setIsSignOutModalOpen(!isSignOutModalOpen);

  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(event, session);
        if (event === "SIGNED_OUT" && session) {
          sessionStorage.setItem("auth", "false");
          navigate("/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    }
  }, [navigate]);



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

      try {
        await axios.post(`${backendURL}/add-vod`, {
          id: user_id,
          title: newVod.title,
          video_url: newVod.url.split("blob:")[1],
        })
      } catch(err) {
        console.error("Unable to add vod", err);
      }
      setVods([...vods, newVod]);
      setCurrentVideoUrl(newVod.url);
      setIsModalOpen(false);
      setNewVodTitle("");
      setNewVodFile(null);
    }
  };

  const handleSignOut = async (e) => {
    e.preventDefault();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      sessionStorage.setItem("auth", "false");
      navigate("/login");
      console.log("Signed out successfully");
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
        <div className="relative w-3/4 h-3/4 rounded-lg shadow-lg overflow-hidden border border-gray-300 bg-black custom-video-border">
          <video
            key={currentVideoUrl}
            ref={videoRef}
            src={currentVideoUrl}
            controls
            className="w-full h-full rounded-lg"
          />
        </div>
      </div>

      <div className="w-1/4 p-4 bg-yellow-100 border-l border-yellow-300 notes">
        {/* Header with Title and Avatar */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-900">Notes</h2>
          <div
            className="avatar cursor-pointer"
            onClick={toggleSignOutModal}
            title="Sign Out"
          >
            <div className="ring-primary ring-offset-base-100 w-12 rounded-full ring ring-offset-2">
              <img
                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                alt="User Avatar"
              />
            </div>
          </div>
        </div>

        {/* Notes Content */}
        <div className="space-y-2 text-yellow-900">
          <ul className="list-none pl-4">
            <li className="custom-bullet">
              Summarizes lectures to <strong>quickly learn material</strong>.
            </li>
            <li className="custom-bullet">
              Summarizes work meetings to{" "}
              <strong>easily define responsibilities</strong>.
            </li>
            <li className="custom-bullet">
              Timestamps for key points in meeting:
              <ul className="list-none pl-6">
                <li className="sub-bullet">
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
            <li className="custom-bullet">Full tool for video analysis.</li>
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

      {/* Model for signing out */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-1/3 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-yellow-900">
              Sign Out
            </h3>
            <p className="mb-6 text-yellow-800">
              Are you sure you want to sign out?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={toggleSignOutModal}
                className="px-4 py-2 bg-gray-200 text-yellow-900 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;
