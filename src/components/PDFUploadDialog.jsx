import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PDFUploadDialog({ open, onOpenChange, entityType, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Por favor, selecione um arquivo PDF");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo PDF");
      return;
    }

    setUploading(true);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      const jsonSchema = entityType === "workorder" ? {
        type: "object",
        properties: {
          client_name: { type: "string" },
          client_phone: { type: "string" },
          client_address: { type: "string" },
          job: { type: "string" },
          producer: { type: "string" },
          description: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" }
              }
            }
          },
          notes: { type: "string" }
        }
      } : {
        type: "object",
        properties: {
          client_name: { type: "string" },
          client_phone: { type: "string" },
          client_email: { type: "string" },
          client_address: { type: "string" },
          job: { type: "string" },
          producer: { type: "string" },
          description: { type: "string" },
          emission_date: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" }
              }
            }
          },
          total_amount: { type: "number" },
          payment_method: { type: "string" },
          due_date: { type: "string" },
          notes: { type: "string" }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: jsonSchema
      });

      if (extractResult.status === "error") {
        toast.error("Erro ao extrair dados do PDF: " + extractResult.details);
        setUploading(false);
        return;
      }

      const extractedData = extractResult.output;

      if (entityType === "workorder") {
        const workOrderData = {
          budget_id: "",
          client_name: extractedData.client_name || "",
          client_phone: extractedData.client_phone || "",
          client_address: extractedData.client_address || "",
          job: extractedData.job || "",
          producer: extractedData.producer || "",
          description: extractedData.description || "",
          items: extractedData.items || [],
          notes: extractedData.notes || "",
          status: "pendente"
        };

        const createdOrder = await base44.entities.WorkOrder.create(workOrderData);
        toast.success("Ordem de serviço criada com sucesso!");
        onSuccess(createdOrder);
      } else {
        const receiptData = {
          client_name: extractedData.client_name || "",
          client_phone: extractedData.client_phone || "",
          client_email: extractedData.client_email || "",
          client_address: extractedData.client_address || "",
          job: extractedData.job || "",
          producer: extractedData.producer || "",
          description: extractedData.description || "",
          emission_date: extractedData.emission_date || new Date().toISOString().split("T")[0],
          items: extractedData.items || [],
          total_amount: extractedData.total_amount || 0,
          payment_method: extractedData.payment_method || "pix",
          due_date: extractedData.due_date || new Date().toISOString().split("T")[0],
          notes: extractedData.notes || ""
        };

        const createdReceipt = await base44.entities.Receipt.create(receiptData);
        toast.success("Recibo criado com sucesso!");
        onSuccess(createdReceipt);
      }

      setFile(null);
    } catch (error) {
      toast.error("Erro ao processar o arquivo");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Importar {entityType === "workorder" ? "Ordem de Serviço" : "Recibo"} via PDF
          </DialogTitle>
          <DialogDescription>
            Faça upload de um PDF para extrair automaticamente os dados e criar {entityType === "workorder" ? "uma ordem de serviço" : "um recibo"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-indigo-600" />
                <p className="text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mt-2"
                >
                  Remover
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Clique para fazer upload
                </p>
                <p className="text-xs text-slate-500">Apenas arquivos PDF</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                onOpenChange(false);
              }}
              disabled={uploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Importar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}