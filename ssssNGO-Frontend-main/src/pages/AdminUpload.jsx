import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import API from "../services/api";
import { ErrorState, PageHeader, SectionCard, ToolbarButton } from "../components/admin/AdminUI";

const AdminUpload = () => {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const objectUrls = images.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setImages(selectedFiles);
  };

  const removeImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (updated.length === 0 && fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();

    if (!images.length) {
      setError("Please select at least one image before publishing.");
      return;
    }

    const formData = new FormData();
    images.forEach((img) => formData.append("images", img));
    formData.append("caption", caption);

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await API.post("/posts", formData);
      setSuccess("Post published successfully.");

      setImages([]);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <PageHeader eyebrow="Public communication" title="Create Post" description="Publish an image update to the website's public gallery." />
      {error && <ErrorState message={error} />}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div>}
      <SectionCard title="Post content" description="Select one or more clear images and add an accessible caption.">
      <form onSubmit={submitPost} className="space-y-6 p-5 md:p-6">

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Select Images
          </label>

          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-[#287080] hover:bg-[#287080]/5">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="pointer-events-none">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#287080]/10 text-[#287080]"><ImagePlus size={22} /></div>
              <p className="font-medium text-slate-800">
                Click or drag images here
              </p>
              <p className="text-sm text-slate-500 mt-1">
                PNG, JPG or JPEG. Choose clear, appropriately sized files.
              </p>
            </div>
          </div>
        </div>

        {previews.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Preview
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previews.map((src, index) => (
                <div
                  key={index}
                  className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                >
                  <img
                    src={src}
                    alt={`Preview ${index + 1}`}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white transition sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={5}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 resize-none"
          />
        </div>

        <div className="flex justify-end"><ToolbarButton primary type="submit" disabled={loading}><Send size={17} />{loading ? "Publishing…" : "Publish post"}</ToolbarButton></div>
      </form>
      </SectionCard>
    </main>
  );
};

export default AdminUpload;
