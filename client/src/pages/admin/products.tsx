import { useState, useMemo } from "react";
import { useProducts, useCreateProduct, useUpdateProduct } from "@/hooks/use-catalog";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import {
  Plus, Package, Edit2, DollarSign, CheckCircle, XCircle,
  Factory, Snowflake, AlignLeft, CalendarDays, Search, X, AlertTriangle
} from "lucide-react";
import type { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const UNITS = [
  { value: "kg", label: "Quilograma (kg)" },
  { value: "caixa", label: "Caixa" },
  { value: "unidade", label: "Unidade" },
  { value: "pallet", label: "Pallet" },
  { value: "bandeja", label: "Bandeja" },
  { value: "pote", label: "Pote" },
  { value: "pacote", label: "Pacote" },
  { value: "display", label: "Display" },
  { value: "porcao", label: "Porção" },
];

const DAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

function useCategories() {
  return useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { credentials: 'include' });
      return res.json() as Promise<{ id: number; name: string }[]>;
    }
  });
}

const emptyForm = {
  name: "",
  category: "",
  unit: "kg",
  active: true,
  basePrice: "",
  isIndustrialized: false,
  isSeasonal: false,
  observation: "",
  curiosity: "",
  availableDays: [] as string[],
  ncm: "",
  cfop: "",
  commercialUnit: "",
};

function productToForm(p: Product): typeof emptyForm {
  return {
    name: p.name,
    category: p.category,
    unit: p.unit,
    active: p.active,
    basePrice: p.basePrice ? String(p.basePrice) : "",
    isIndustrialized: p.isIndustrialized ?? false,
    isSeasonal: p.isSeasonal ?? false,
    observation: (p as any).observation || "",
    curiosity: (p as any).curiosity || "",
    availableDays: Array.isArray((p as any).availableDays) ? (p as any).availableDays as string[] : [],
    ncm: (p as any).ncm || "",
    cfop: (p as any).cfop || "",
    commercialUnit: (p as any).commercialUnit || "",
  };
}

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [priceError, setPriceError] = useState(false);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(productToForm(product));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setPriceError(false);
  };

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(false);

    const priceNum = Number(formData.basePrice);
    if (!formData.basePrice || isNaN(priceNum) || priceNum <= 0) {
      setPriceError(true);
      toast({ title: 'Preço base obrigatório', description: 'Informe um preço base válido (maior que zero) antes de salvar.', variant: 'destructive' });
      return;
    }

    const payload: any = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      active: formData.active,
      basePrice: String(priceNum),
      isIndustrialized: formData.isIndustrialized,
      isSeasonal: formData.isSeasonal,
      observation: formData.observation || null,
      curiosity: formData.curiosity || null,
      availableDays: formData.availableDays.length > 0 ? formData.availableDays : null,
      ncm: formData.ncm || null,
      cfop: formData.cfop || null,
      commercialUnit: formData.commercialUnit || null,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data: payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    closeModal();
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products?.forEach(p => cats.add(p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCat = filterCat === 'ALL' || p.category === filterCat;
      const matchStatus = filterStatus === 'ALL' || (filterStatus === 'ACTIVE' ? p.active : !p.active);
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, search, filterCat, filterStatus]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie frutas, unidades, preços e atributos.</p>
        </div>
        <button
          data-testid="button-add-product"
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Produto
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-border text-sm focus:border-primary outline-none">
          <option value="ALL">Todas as categorias</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {['ALL', 'ACTIVE', 'INACTIVE'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${filterStatus === s ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
            {s === 'ALL' ? 'Todos' : s === 'ACTIVE' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
        <span className="text-xs text-muted-foreground font-medium">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Carregando produtos...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Nenhum produto encontrado.</div>
        ) : filtered.map(product => (
          <div key={product.id} className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow flex flex-col items-center text-center group relative">
            <button
              data-testid={`button-edit-product-${product.id}`}
              onClick={() => openEdit(product)}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Flag badges top-left */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {(product as any).isIndustrialized && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md text-xs font-bold">
                  <Factory className="w-3 h-3" /> Ind.
                </span>
              )}
              {(product as any).isSeasonal && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">
                  <Snowflake className="w-3 h-3" /> Saz.
                </span>
              )}
            </div>

            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${product.active ? 'bg-secondary/10' : 'bg-muted'}`}>
              <Package className={`w-8 h-8 ${product.active ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>

            <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">{product.category}</p>

            {(product as any).observation && (
              <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{(product as any).observation}</p>
            )}

            <div className="mt-3 inline-block px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
              Por {product.unit}
            </div>

            {(product as any).availableDays && Array.isArray((product as any).availableDays) && (product as any).availableDays.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 justify-center">
                {((product as any).availableDays as string[]).map(d => (
                  <span key={d} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                    {d.split('-')[0].slice(0, 3)}
                  </span>
                ))}
              </div>
            )}

            {product.basePrice ? (
              <div className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-primary/10 rounded-xl">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  R$ {Number(product.basePrice).toFixed(2)} <span className="font-normal text-primary/70">(base)</span>
                </span>
              </div>
            ) : (
              <div className="mt-3 px-4 py-2 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-xs font-bold text-orange-600">Preço base não definido</p>
              </div>
            )}

            <span className={`mt-3 text-xs font-bold px-2 py-0.5 rounded-full ${product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? `Editar: ${editingProduct.name}` : "Novo Produto"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Produto *</label>
            <input required value={formData.name} onChange={e => set("name", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
              placeholder="ex: Banana Nanica" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Categoria *</label>
              <input
                required list="cat-list" value={formData.category} onChange={e => set("category", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
                placeholder="ex: Frutas In Natura"
              />
              <datalist id="cat-list">
                {categories?.map(c => <option key={c.id} value={c.name} />)}
                {["Frutas In Natura", "Frutas Higienizadas", "Frutas Cortadas", "Snacks Saudáveis", "Mix de Oleaginosas", "Industrializados"].map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Unidade *</label>
              <select value={formData.unit} onChange={e => set("unit", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="flex items-center gap-1 text-sm font-semibold mb-1">
              <AlignLeft className="w-4 h-4" /> Observação
            </label>
            <input value={formData.observation} onChange={e => set("observation", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
              placeholder="ex: Display com 12 unidades, Bandeja com 6 potes..." />
            <p className="text-xs text-muted-foreground mt-1">Aparece no catálogo do cliente e nos relatórios.</p>
          </div>

          {/* Curiosidade */}
          <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50">
            <label className="flex items-center gap-1 text-sm font-bold text-amber-800 mb-2">
              🍊 Curiosidade do Produto
            </label>
            <textarea value={formData.curiosity} onChange={e => set("curiosity", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none text-sm bg-white resize-none"
              placeholder="ex: A maçã contém antioxidantes naturais que ajudam a proteger o coração..." />
            <p className="text-xs text-amber-700 mt-1">Conteúdo educativo exibido no assistente virtual e no quadro de curiosidades.</p>
          </div>

          {/* Flags row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-colors ${formData.isIndustrialized ? 'bg-orange-500' : 'bg-muted'} relative flex-shrink-0`}
                  onClick={() => set("isIndustrialized", !formData.isIndustrialized)}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${formData.isIndustrialized ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm text-orange-800 flex items-center gap-1"><Factory className="w-4 h-4" /> Industrializado</p>
                  <p className="text-xs text-orange-600">Registrado no controle de industrializados</p>
                </div>
              </label>
            </div>
            <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-colors ${formData.isSeasonal ? 'bg-blue-500' : 'bg-muted'} relative flex-shrink-0`}
                  onClick={() => set("isSeasonal", !formData.isSeasonal)}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${formData.isSeasonal ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm text-blue-800 flex items-center gap-1"><Snowflake className="w-4 h-4" /> Sazonal</p>
                  <p className="text-xs text-blue-600">Produto disponível sazonalmente</p>
                </div>
              </label>
            </div>
          </div>

          {/* Dados Fiscais */}
          <div className="p-4 rounded-xl border-2 border-violet-200 bg-violet-50">
            <label className="flex items-center gap-1 text-sm font-bold text-violet-800 mb-3">
              <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Dados Fiscais</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1">NCM</label>
                <input value={formData.ncm} onChange={e => set("ncm", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-violet-200 focus:border-violet-400 outline-none text-sm"
                  placeholder="ex: 0803.10.00" />
                <p className="text-xs text-muted-foreground mt-0.5">Nomenclatura Comum do Mercosul</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1">CFOP</label>
                <input value={formData.cfop} onChange={e => set("cfop", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-violet-200 focus:border-violet-400 outline-none text-sm"
                  placeholder="ex: 5102" />
                <p className="text-xs text-muted-foreground mt-0.5">Código Fiscal de Operações</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1">Unid. Comercial</label>
                <input value={formData.commercialUnit} onChange={e => set("commercialUnit", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-violet-200 focus:border-violet-400 outline-none text-sm"
                  placeholder="ex: KG, UN, CX" />
                <p className="text-xs text-muted-foreground mt-0.5">Para NF-e</p>
              </div>
            </div>
          </div>

          {/* Available days */}
          <div>
            <label className="flex items-center gap-1 text-sm font-semibold mb-2">
              <CalendarDays className="w-4 h-4" /> Dias de Venda Disponíveis
            </label>
            <p className="text-xs text-muted-foreground mb-2">Deixe em branco para disponível todos os dias.</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day} type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${formData.availableDays.includes(day) ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                  {day.split('-')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Base Price */}
          <div className={`p-4 rounded-xl border-2 ${priceError ? 'border-red-400 bg-red-50' : 'border-primary/20 bg-primary/5'}`}>
            <label className={`flex items-center gap-2 text-sm font-bold mb-2 ${priceError ? 'text-red-600' : 'text-primary'}`}>
              <DollarSign className="w-4 h-4" /> Preço Base Interno (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number" step="0.01" min="0"
              value={formData.basePrice}
              onChange={e => { set("basePrice", e.target.value); if (priceError) setPriceError(false); }}
              placeholder="Ex: 5,90"
              data-testid="input-product-price"
              className={`w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-lg font-bold ${priceError ? 'border-red-400 focus:border-red-500 bg-white' : 'border-border focus:border-primary'}`}
            />
            {priceError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 font-semibold mt-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Preço obrigatório. Informe um valor maior que zero.
              </p>
            )}
            {!priceError && (
              <p className="text-xs text-muted-foreground mt-2">
                Preço interno da VivaFrutaz. Preço final ao cliente = base × (1 + taxa admin / 100).
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => set("active", true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${formData.active ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:border-green-400'}`}>
                <CheckCircle className="w-4 h-4" /> Ativo
              </button>
              <button type="button" onClick={() => set("active", false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${!formData.active ? 'bg-red-600 text-white border-red-600' : 'border-border text-muted-foreground hover:border-red-400'}`}>
                <XCircle className="w-4 h-4" /> Inativo
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {isPending ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Adicionar Produto"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
