import HeroSlider from "../components/HeroSlider";
import JoinCTA from "../components/JoinCTA";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import API from "../services/api";
import { useEffect, useState } from "react";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const res = await API.get("/posts");
    setPosts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <>
      {/* HERO SLIDER */}
      <HeroSlider />

      {/* POSTS SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-[#0C2C55] mb-8 text-center">
          Our Work & Campaigns
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))
            : posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  refreshPosts={fetchPosts}
                />
              ))}
        </div>
      </section>

      {/* JOIN CTA */}
      <JoinCTA />
    </>
  );
};

export default Home;
