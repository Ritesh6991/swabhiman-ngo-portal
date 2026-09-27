import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const PostCard = ({ post }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [likes, setLikes] = useState(post.likes || []);

  const likedByMe = user && likes.includes(user._id);

  const handleLike = async () => {
    if (!user) return alert("Login required");

    const res = await API.post(`/posts/${post._id}/like`);
    setLikes(res.data);
  };

  const image = post.images?.[0];

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <img
        src={image}
        onClick={() => navigate(`/posts/${post._id}`)}
        className="w-full h-64 object-cover cursor-pointer"
      />

      <div className="p-3">
        <p className="line-clamp-2">{post.caption}</p>

        <div className="flex gap-4 mt-2 text-sm">
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={handleLike}
            className={likedByMe ? "text-red-500" : ""}
          >
            ❤️ {likes.length}
          </motion.button>

          <span>💬 {post.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;