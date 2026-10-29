import HeroSlider from "../components/HeroSlider";
import JoinCTA from "../components/JoinCTA";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import API from "../services/api";
import { useEffect, useState } from "react";
import AnnouncementBar from "../components/AnnouncementBar";
import { Link } from "react-router-dom";

const HOMEPAGE_POST_LIMIT = 6;

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState(null);

  const fetchPosts = async () => {
    const res = await API.get("/posts");
    setPosts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    API.get("/announcements/active").then(({ data }) => setAnnouncement(data.find((item) => ["homepage", "both"].includes(item.placement)) || null)).catch(() => {});
  }, []);

  return (
    <>
      {/* HERO SLIDER */}
      <HeroSlider />
      <AnnouncementBar announcement={announcement} compact />

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
            : posts.slice(0, HOMEPAGE_POST_LIMIT).map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  refreshPosts={fetchPosts}
                />
              ))}
        </div>
        {!loading && posts.length > HOMEPAGE_POST_LIMIT && (
          <div className="mt-10 text-center">
            <Link
              to="/posts"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0C2C55] px-6 py-2.5 font-semibold text-white transition hover:bg-[#123f75] focus:outline-none focus:ring-2 focus:ring-[#0C2C55] focus:ring-offset-2"
            >
              View All Campaigns
            </Link>
          </div>
        )}
      </section>

      {/* JOIN CTA */}
      <JoinCTA />
    </>
  );
};

export default Home;
