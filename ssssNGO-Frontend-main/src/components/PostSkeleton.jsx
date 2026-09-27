const PostSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
      <div className="h-56 bg-gray-300" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-300 rounded w-16" />
          <div className="h-4 bg-gray-300 rounded w-16" />
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;
