import React, { useState, useEffect, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import { supabase } from "./supabaseClient";
import axios from "axios";
import boltLogo from "./assets/lightningBolt.png";

const backendURL = process.env.REACT_APP_BACKEND_URL;

function Home() {
  const [vods, setVods] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVodTitle, setNewVodTitle] = useState("");
  const [newVodFile, setNewVodFile] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const videoRef = useRef(null);

  // Fetch VODs after the component mounts
  useEffect(() => {
    const fetchVods = async () => {
      const user = await supabase.auth
        .getSession()
        .then(({ data }) => data.session.user);

      if (user) {
        try {
          const response = await axios.get(`${backendURL}/vods/${user.id}`);
          setVods(response.data);
          if (response.data.length > 0) {
            setCurrentVideoUrl(response.data[0].video_url); // Set the first VOD as the default video
          }
        } catch (err) {
          console.error("Error fetching VODs:", err);
        }
      }
    };

    fetchVods();
  }, []);

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
      // Ensure the user is authenticated
      const session = await supabase.auth.getSession();
      const user_id = session?.data?.session?.user?.id;

      if (!user_id) {
        console.error("User not authenticated");
        return;
      }

      try {
        // Sanitize the file name to avoid issues with spaces or special characters
        const sanitizedFileName = newVodFile.name
          .replace(/[^a-z0-9.]/gi, "_")
          .toLowerCase();

        // Upload the video file to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from("vods")
          .upload(`videos/${user_id}/${sanitizedFileName}`, newVodFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          return;
        }

        // Get the public URL for the uploaded video
        const filePath = `videos/${user_id}/${sanitizedFileName}`;
        console.log("filePath for getPublicUrl:", filePath);
        const { publicURL, error: publicURLError } = supabase.storage
          .from("vods")
          .getPublicUrl(filePath);

        if (publicURLError) {
          console.error("Error getting public URL:", publicURLError);
          return;
        }
        console.log(publicURL);
        // Prepare the new VOD metadata for the database
        const newVod = {
          id: user_id,
          title: newVodTitle,
          video_url: publicURL, // Use the public URL from Supabase Storage
        };

        console.log(newVod.video_url);

        // Insert the video metadata into the backend database
        await axios.post(`${backendURL}/add-vod`, newVod);

        // Update the local state with the new VOD
        setVods([...vods, newVod]);
        setCurrentVideoUrl(publicURL);
        setIsModalOpen(false);
        setNewVodTitle("");
        setNewVodFile(null);
      } catch (err) {
        console.error("Unable to add VOD", err);
      }
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
              key={vod.vod_id}
              className={`p-2 rounded shadow cursor-pointer hover:bg-yellow-200 ${
                vod.video_url === currentVideoUrl ? "bg-yellow-300" : "bg-white"
              }`}
              onClick={() => changeVideo(vod.video_url)}
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

      {/* Right Sidebar */}
      <div className="w-1/4 p-4 bg-yellow-100 border-l border-yellow-300 notes">
        <h2 className="text-xl font-semibold mb-4 text-yellow-900">Notes</h2>
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
    </div>
  );
}

export default Home;
