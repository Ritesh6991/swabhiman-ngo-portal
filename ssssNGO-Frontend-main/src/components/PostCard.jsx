import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import LinkifiedPostText from "./LinkifiedPostText";
import { optimizePublicImage } from "../utils/imageDelivery";

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

  const image = optimizePublicImage(post.images?.[0], 800);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <img
        src={image}
        alt={post.caption ? `${post.caption.replace(/\s+/g, " ").trim().slice(0, 120)} — campaign photograph` : "Swabhiman Nyas campaign photograph"}
        loading="lazy"
        decoding="async"
        width="800"
        height="450"
        onClick={() => navigate(`/posts/${post._id}`)}
        className="w-full h-64 object-cover cursor-pointer"
      />

      <div className="p-3">
        <p className="line-clamp-2 whitespace-pre-wrap break-words">
          <LinkifiedPostText text={post.caption} />
        </p>

        <div className="flex gap-4 mt-2 text-sm">
          <button
            onClick={handleLike}
            className={`${likedByMe ? "text-red-500" : ""} transition-transform active:scale-125`}
            aria-label={likedByMe ? "Unlike this post" : "Like this post"}
          >
            ❤️ {likes.length}
          </button>

          <span>💬 {post.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
