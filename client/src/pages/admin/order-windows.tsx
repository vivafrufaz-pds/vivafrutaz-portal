import { useState } from "react";
import { useOrderWindows, useCreateOrderWindow } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { CalendarDays, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

export default function OrderWindowsPage() {
  const { data: windows, isLoading } = useOrderWindows();
  const createWindow = useCreateOrderWindow();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    weekReference: "",
    orderOpenDate: "",
    orderCloseDate: "",
    deliveryStartDate: "",
    deliveryEndDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createWindow.mutateAsync(formData);
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Order Windows</h1>
          <p className="text-muted-foreground mt-1">Define when clients can place orders.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Open New Window
        </button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading windows...</div>
        ) : windows?.map(w => (
          <div key={w.id} className={`bg-card rounded-2xl p-6 border premium-shadow flex flex-col md:flex-row items-center justify-between gap-6 ${w.active ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border/50'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${w.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <CalendarDays className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Week: {w.weekReference}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${w.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {w.active ? 'ACTIVE' : 'CLOSED'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-8 text-sm text-foreground">
              <div>
                <p className="text-muted-foreground font-semibold flex items-center gap-1"><Clock className="w-4 h-4"/> Order Period</p>
                <p className="font-medium mt-1">{format(new Date(w.orderOpenDate), 'MMM d, h:mm a')} - {format(new Date(w.orderCloseDate), 'MMM d, h:mm a')}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold flex items-center gap-1"><PackageOpen className="w-4 h-4"/> Delivery Window</p>
                <p className="font-medium mt-1">{format(new Date(w.deliveryStartDate), 'MMM d')} - {format(new Date(w.deliveryEndDate), 'MMM d')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Order Window" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Week Reference</label>
            <input required value={formData.weekReference} onChange={e => setFormData({...formData, weekReference: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="e.g. W42 - Oct 2023" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Order Open Date/Time</label>
              <input type="datetime-local" required value={formData.orderOpenDate} onChange={e => setFormData({...formData, orderOpenDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Order Close Date/Time</label>
              <input type="datetime-local" required value={formData.orderCloseDate} onChange={e => setFormData({...formData, orderCloseDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Delivery Start Date</label>
              <input type="date" required value={formData.deliveryStartDate} onChange={e => setFormData({...formData, deliveryStartDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Delivery End Date</label>
              <input type="date" required value={formData.deliveryEndDate} onChange={e => setFormData({...formData, deliveryEndDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <button type="submit" disabled={createWindow.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createWindow.isPending ? "Creating..." : "Publish Window"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
