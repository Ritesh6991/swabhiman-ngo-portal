import { useEffect, useState } from "react";
import API from "../services/api";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/posts");
      setPosts(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-[#0C2C55] mb-8 text-center">
        Our Work & Campaigns
      </h1>

      {/* ERROR STATE */}
      {error && (
        <div className="text-center text-red-500 mb-6">
          {error}
          <button
            onClick={fetchPosts}
            className="ml-3 text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-500">
          No campaigns yet 🚀
        </p>
      )}

      {/* POSTS */}
      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Posts;