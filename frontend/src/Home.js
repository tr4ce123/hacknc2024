import React, { useState, useEffect, useRef } from "react";
import { FaPlus, FaTrash, FaSignOutAlt } from "react-icons/fa";
import axios from "axios";
import boltLogo from "./assets/lightningBolt.png";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

const backendURL = process.env.REACT_APP_BACKEND_URL;

function Home() {
  const [vods, setVods] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVodTitle, setNewVodTitle] = useState("");
  const [newVodFile, setNewVodFile] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null); // Initialize to null
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [currentVodId, setCurrentVodId] = useState(null);
  const toggleSignOutModal = () => setIsSignOutModalOpen(!isSignOutModalOpen);
  const navigate = useNavigate();

  const videoRef = useRef(null);

  const [leftWidth, setLeftWidth] = useState(15);
  const [centerWidth, setCenterWidth] = useState(55);
  const [rightWidth, setRightWidth] = useState(30);

  // Refs to track resizing
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // Mouse event handlers for resizing
  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    if (direction === "left") {
      isResizingLeft.current = true;
    } else if (direction === "right") {
      isResizingRight.current = true;
    }
  };

  const handleMouseMove = (e) => {
    if (isResizingLeft.current) {
      const deltaX = e.movementX;
      const totalWidth = window.innerWidth;
      let newLeftWidth =
        (((leftWidth * totalWidth) / 100 + deltaX) / totalWidth) * 100;
      let newCenterWidth =
        (((centerWidth * totalWidth) / 100 - deltaX) / totalWidth) * 100;

      if (newLeftWidth < 10) {
        newLeftWidth = 10;
        newCenterWidth = leftWidth + centerWidth - 10;
      } else if (newCenterWidth < 10) {
        newCenterWidth = 10;
        newLeftWidth = leftWidth + centerWidth - 10;
      }

      setLeftWidth(newLeftWidth);
      setCenterWidth(newCenterWidth);
    } else if (isResizingRight.current) {
      const deltaX = -e.movementX;
      const totalWidth = window.innerWidth;
      let newRightWidth =
        (((rightWidth * totalWidth) / 100 + deltaX) / totalWidth) * 100;
      let newCenterWidth =
        (((centerWidth * totalWidth) / 100 - deltaX) / totalWidth) * 100;

      if (newRightWidth < 10) {
        newRightWidth = 10;
        newCenterWidth = centerWidth + rightWidth - 10;
      } else if (newCenterWidth < 10) {
        newCenterWidth = 10;
        newRightWidth = centerWidth + rightWidth - 10;
      }

      setRightWidth(newRightWidth);
      setCenterWidth(newCenterWidth);
    }
  };

  const handleMouseUp = () => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

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
            setCurrentVodId(response.data[0].vod_id);
          }
        } catch (err) {
          console.error("Error fetching VODs:", err);
        }
      }
    };

    fetchVods();
  }, []);

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
    };
  }, [navigate]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (currentVodId) {
        try {
          const response = await axios.get(
            `${backendURL}/notes/${currentVodId}`
          );
          setNotes(response.data);
        } catch (err) {
          console.error("Error fetching notes:", err);
        }
      }
    };

    fetchNotes();
  }, [currentVodId, notes]);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const changeVideo = (vod) => {
    setCurrentVideoUrl(vod.video_url);
    setCurrentVodId(vod.vod_id);
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
      const user_id = sessionStorage.getItem("user");

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
        const uploadPayload = await supabase.storage
          .from("vods")
          .upload(`videos/${user_id}/${sanitizedFileName}`, newVodFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadPayload.error) {
          console.error("Error uploading file:", uploadPayload.error);
          return;
        }

        // Get the public URL for the uploaded video
        const filePath = `videos/${user_id}/${sanitizedFileName}`;
        console.log("filePath for getPublicUrl:", filePath);
        const filePayload = supabase.storage
          .from("vods")
          .getPublicUrl(filePath);

        if (!filePayload.data) {
          console.error("Error getting public URL");
          return;
        }
        // Prepare the new VOD metadata for the database
        const newVod = {
          id: user_id,
          title: newVodTitle,
          video_url: filePayload.data.publicUrl,
        };

        // Insert the video metadata into the backend database
        await axios.post(`${backendURL}/add-vod`, newVod);

        const response = await axios.get(`${backendURL}/vods/${user_id}`);
        const updatedVods = response.data;  

        setVods(updatedVods);

        const newVodFromBackend = updatedVods.find(
          (vod) => vod.video_url === newVod.video_url
        );
        setCurrentVideoUrl(newVodFromBackend.video_url);
        setCurrentVodId(newVodFromBackend.vod_id);
  
        // Update the local state with the new VOD
        setIsModalOpen(false);
        setNewVodTitle("");
        setNewVodFile(null);
        if (newVodFromBackend) {
          // Use the obtained vodId in the transcription request
          await axios.post(`${backendURL}/transcribe`, {
            audioUrl: "https://assembly.ai/sports_injuries.mp3",
            vodId: newVodFromBackend.vod_id, 
          });
        } else {
          console.error("Added VOD not found or missing 'id'");
        }

      } catch (err) {
        console.error("Unable to add VOD", err);
      }
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

  const handleRemoveVod = async (inputVod) => {
    try {
      const matchingVod = vods.find(
        (vod) => vod.video_url === inputVod.video_url
      );

      const user_id = sessionStorage.getItem("user");


      // Check if a matching VOD was found
      if (!matchingVod) {
        console.error("VOD not found");
        return;
      }

      const url = matchingVod.video_url.split("/vods/")[1];

      await axios.delete(`${backendURL}/vods/${matchingVod.vod_id}`);

      const { data, error } = await supabase.storage.from("vods").remove([url]);

      const response = await axios.get(`${backendURL}/vods/${user_id}`);
      const updatedVods = response.data;  

      setVods(updatedVods);

      if (error) {
        console.error("Error deleting VOD from storage:", error);
      }

      if (matchingVod.vod_id === currentVodId) {
        if (updatedVods.length > 0) {
          setCurrentVideoUrl(updatedVods[0].video_url);
          setCurrentVodId(updatedVods[0].vod_id);
        } else {
          setCurrentVideoUrl(null);
          setCurrentVodId(null);
        }
      }
  
    } catch (error) {
      console.error("Error deleting VOD:", error);
    }
  };

  const renderNote = (note) => {
    const isSubNote = note.parent_note_id !== null;

    return (
      <button
        key={note.note_id}
        onClick={() => seekToTimestamp(note.timestamp)}
        className={`p-2 w-full text-left rounded-full ${
          isSubNote ? "pl-6" : "pl-4"
        } hover:bg-amber-200 cursor-pointer`}
        style={{
          marginLeft: isSubNote ? "1.5rem" : "0",
          fontSize: isSubNote ? "0.9rem" : "1.0rem",
          width: isSubNote ? "calc(100% - 1.5rem)" : "100%",
        }}
      >
        - {note.text}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-yellow-50">
      {/* Left Sidebar (VODs) */}
      <div
        style={{ width: `${leftWidth}%` }}
        className="p-4 bg-yellow-100 border-r border-yellow-300 overflow-auto"
      >
        {/* Left Sidebar Content */}
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
              className={`flex justify-between items-center p-2 rounded shadow cursor-pointer hover:bg-yellow-200 ${
                vod.video_url === currentVideoUrl ? "bg-yellow-300" : "bg-white"
              }`}
              onClick={() => changeVideo(vod)}
            >
              <span>{vod.title}</span>
              <button
                className="flex items-center justify-center w-6 h-6 bg-orange-900 text-white rounded hover:bg-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveVod(vod);
                }}
                title="Remove VOD"
              >
                <FaTrash size={10} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Resizer Bar for Left */}
      <div
        onMouseDown={(e) => handleMouseDown(e, "left")}
        className="w-1 bg-gray-400 cursor-col-resize"
      />
      {/* Sign Out Button */}
      <button
        onClick={toggleSignOutModal}
        className="absolute bottom-4 left-4 text-yellow-900 hover:text-yellow-600"
        title="Sign Out"
      >
        <FaSignOutAlt size={24} />
      </button>

      {/* Video Player (Center) */}
      <div
        style={{ width: `${centerWidth}%` }}
        className="flex flex-col items-center overflow-auto"
      >
        <img src={boltLogo} alt="Bolt Logo" className="w-24 h-24 mb-4" />
        <div className="relative w-5/6 h-3/4 rounded-lg shadow-lg overflow-hidden border border-gray-300 bg-black custom-video-border">
          {currentVideoUrl ? (
            <video
              key={currentVideoUrl}
              ref={videoRef}
              src={currentVideoUrl}
              controls
              className="w-full h-full rounded-lg"
            />
          ) : (
            <p className="text-white text-center mt-4">
              Select a video to play
            </p>
          )}
        </div>
      </div>
      {/* Resizer Bar for Right */}
      <div
        onMouseDown={(e) => handleMouseDown(e, "right")}
        className="w-1 bg-gray-400 cursor-col-resize"
      />
      {/* Right Sidebar */}
      <div
        style={{ width: `${rightWidth}%` }}
        className="p-4 bg-yellow-100 border-l border-yellow-300 overflow-auto"
      >
        {/* Right Sidebar Content */}
        {/* Header with Title and Avatar */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-900">Notes</h2>
        </div>
        {/* Notes Content */}
        <div className="flex-grow overflow-y-auto space-y-2 text-yellow-900">
          {notes.length > 0 ? (
            <ul className="list-none pl-4">
              {notes.map((note) => renderNote(note))}
            </ul>
          ) : (
            <p>No notes available for this VOD.</p>
          )}
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

      {/* Modal for Signing Out */}
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
