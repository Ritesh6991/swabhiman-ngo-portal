import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ImageSlider from "../components/ImageSlider";
import API from "../services/api";

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    let active = true;
    API.get(`/posts/${id}`).then((res) => {
      if (active) setPost(res.data);
    });
    return () => { active = false; };
  }, [id]);

  if (!post) return <p className="text-center mt-10">Loading...</p>;

  const likedByMe = user && post.likes?.includes(user._id);

  const handleLike = async () => {
    if (!user) return alert("Login required");

    const res = await API.post(`/posts/${id}/like`);
    setPost((p) => ({ ...p, likes: res.data }));
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;

    const res = await API.post(`/posts/${id}/comment`, {
      text: commentText,
      userName: user.name,
    });

    setPost((p) => ({ ...p, comments: res.data }));
    setCommentText("");
  };

  const images = post.images || [];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* SLIDER */}
      <ImageSlider images={images} />

      {/* ACTION BAR */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-4 text-lg">
          <button
            onClick={handleLike}
            className={likedByMe ? "text-red-500" : ""}
          >
            ❤️ {post.likes.length}
          </button>

          <span>💬 {post.comments.length}</span>
        </div>

        <span className="text-gray-400 text-sm">
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* CAPTION */}
      <p className="mt-4 text-lg leading-relaxed">{post.caption}</p>

      {/* COMMENTS */}
      <div className="space-y-3 mt-6">
        {post.comments.map((c, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-3">
            <p className="font-semibold text-sm">{c.userName}</p>
            <p className="text-gray-600">{c.text}</p>
          </div>
        ))}
      </div>

      {/* COMMENT INPUT */}
      <div className="flex gap-2 mt-6">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleComment}
          className="bg-blue-500 text-white px-5 rounded-full"
        >
          Post
        </button>
      </div>
    </div>
  );
};

export default PostDetail;
