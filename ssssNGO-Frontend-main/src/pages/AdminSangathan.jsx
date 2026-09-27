import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, RefreshCw, RotateCcw, Trash2, UsersRound } from "lucide-react";
import API from "../services/api";
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, ToolbarButton } from "../components/admin/AdminUI";

const emptyForm = { name: "", role: "", phone: "", section: "leadership", sortOrder: "10", photo: null };
const apiOrigin = API.defaults.baseURL.replace(/\/api\/?$/, "");
const imageSource = (value) => value?.startsWith("/") ? `${apiOrigin}${value}` : value;

const AdminSangathan = () => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fileKey, setFileKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/sangathan");
      setMembers(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Sangathan members could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => ({
    leadership: members.filter((member) => member.section === "leadership"),
    workers: members.filter((member) => member.section === "workers"),
  }), [members]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setFileKey((value) => value + 1);
  };

  const beginEdit = (member) => {
    setEditingId(member._id);
    setForm({
      name: member.name,
      role: member.role,
      phone: member.phone || "",
      section: member.section,
      sortOrder: String(member.sortOrder ?? 0),
      photo: null,
    });
    setMessage("");
    setError("");
    setFileKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append("name", form.name);
    data.append("role", form.role);
    data.append("phone", form.phone);
    data.append("section", form.section);
    data.append("sortOrder", form.sortOrder);
    if (form.photo) data.append("photo", form.photo);

    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (editingId) {
        await API.put(`/sangathan/${editingId}`, data);
        setMessage("Sangathan member updated successfully.");
      } else {
        await API.post("/sangathan", data);
        setMessage("New member added to the Sangathan page.");
      }
      resetForm();
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The member could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member) => {
    if (!window.confirm(`Remove ${member.name} from the Sangathan page?`)) return;
    try {
      setDeletingId(member._id);
      setError("");
      setMessage("");
      await API.delete(`/sangathan/${member._id}`);
      if (editingId === member._id) resetForm();
      setMessage("Member removed from the Sangathan page.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The member could not be removed.");
    } finally {
      setDeletingId("");
    }
  };

  const renderMember = (member) => (
    <article key={member._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-[#287080]">
        {member.imageUrl ? <img src={imageSource(member.imageUrl)} alt="" className="h-full w-full object-cover" /> : <UsersRound size={24} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#102A43]">{member.name}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Order {member.sortOrder ?? 0}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-[#287080]">{member.role}</p>
        <p className="mt-1 text-sm text-slate-500">{member.phone || "No phone number"}</p>
      </div>
      <div className="flex gap-2">
        <ToolbarButton onClick={() => beginEdit(member)}><Pencil size={16} />Edit</ToolbarButton>
        <ToolbarButton danger disabled={deletingId === member._id} onClick={() => remove(member)}><Trash2 size={16} />Remove</ToolbarButton>
      </div>
    </article>
  );

  return <div className="space-y-7">
    <PageHeader
      eyebrow="Public website"
      title="Sangathan Management"
      description="Add, edit, arrange or remove the people shown in every section of the public Sangathan page."
      actions={<ToolbarButton onClick={load}><RefreshCw size={17} />Refresh</ToolbarButton>}
    />

    {error && <ErrorState message={error} onRetry={load} />}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}

    <SectionCard title={editingId ? "Edit Sangathan member" : "Add a Sangathan member"} description="The display order controls the position inside the selected section.">
      <form onSubmit={submit} className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Name
          <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-input mt-2" placeholder="Member name" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Designation
          <input required maxLength={160} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="form-input mt-2" placeholder="President, coordinator, member…" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Phone
          <input maxLength={50} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="form-input mt-2" placeholder="Phone number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Section
          <select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} className="form-input mt-2">
            <option value="leadership">Leadership</option>
            <option value="workers">Key Sangathan Members</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Display order
          <input type="number" min="0" max="10000" required value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="form-input mt-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Photo {editingId && <span className="font-normal text-slate-400">(optional replacement)</span>}
          <span className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-500">
            <ImagePlus size={18} />{form.photo?.name || "Choose JPG, PNG or WebP"}
            <input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, photo: event.target.files?.[0] || null })} className="sr-only" />
          </span>
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
          <ToolbarButton primary type="submit" disabled={saving}>{editingId ? <Pencil size={17} /> : <Plus size={17} />}{saving ? "Saving…" : editingId ? "Save changes" : "Add member"}</ToolbarButton>
          {editingId && <ToolbarButton type="button" onClick={resetForm}><RotateCcw size={17} />Cancel edit</ToolbarButton>}
        </div>
      </form>
    </SectionCard>

    {loading ? <LoadingState label="Loading Sangathan members…" /> : <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title={`Leadership (${grouped.leadership.length})`} description="Featured cards at the top of the public page">
        {!grouped.leadership.length ? <EmptyState title="No leadership members" description="Add a member and select the Leadership section." /> : <div className="divide-y divide-slate-100">{grouped.leadership.map(renderMember)}</div>}
      </SectionCard>
      <SectionCard title={`Key Sangathan Members (${grouped.workers.length})`} description="The main member grid on the public page">
        {!grouped.workers.length ? <EmptyState title="No members in this section" description="Add a member and select Key Sangathan Members." /> : <div className="divide-y divide-slate-100">{grouped.workers.map(renderMember)}</div>}
      </SectionCard>
    </div>}
  </div>;
};

export default AdminSangathan;
