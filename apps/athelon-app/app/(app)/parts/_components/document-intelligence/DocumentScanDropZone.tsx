"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, Image, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_ROLES,
  DOCUMENT_ROLE_LABELS,
  type DocumentRole,
} from "@/src/shared/lib/documentIntelligence";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/tiff",
  "image/webp",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export interface ScanFile {
  file: File;
  documentRole: DocumentRole;
  id: string;
}

export function DocumentScanDropZone({
  files,
  onFilesChange,
  disabled,
}: {
  files: ScanFile[];
  onFilesChange: (files: ScanFile[]) => void;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const additions: ScanFile[] = [];
      for (const file of Array.from(newFiles)) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_FILE_SIZE) continue;

        // Auto-detect role from filename
        let role: DocumentRole = "other";
        const lower = file.name.toLowerCase();
        if (lower.includes("8130") || lower.includes("tag")) role = "8130_3_tag";
        else if (lower.includes("coc") || lower.includes("conformi")) role = "certificate_of_conformity";
        else if (lower.includes("invoice")) role = "vendor_invoice";
        else if (lower.includes("packing") || lower.includes("slip")) role = "packing_slip";
        else if (lower.includes("cert") || lower.includes("material") || lower.includes("mill")) role = "material_certification";
        else if (lower.includes("spec")) role = "spec_sheet";
        else if (file.type.startsWith("image/")) role = "photo";

        additions.push({
          file,
          documentRole: role,
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        });
      }
      onFilesChange([...files, ...additions]);
    },
    [files, onFilesChange],
  );

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const updateRole = (id: string, role: DocumentRole) => {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, documentRole: role } : f)),
    );
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={() => {
          if (disabled) return;
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ACCEPTED_TYPES.join(",");
          input.onchange = () => {
            if (input.files) addFiles(input.files);
          };
          input.click();
        }}
      >
        <Upload className="w-8 h-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Drop documents here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, JPEG, PNG, TIFF, WebP — up to 25 MB per file
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((sf) => (
            <Card key={sf.id} className="p-3">
              <div className="flex items-center gap-3">
                {sf.file.type.startsWith("image/") ? (
                  <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sf.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(sf.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Select
                  value={sf.documentRole}
                  onValueChange={(v) => updateRole(sf.id, v as DocumentRole)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {DOCUMENT_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(sf.id);
                  }}
                  disabled={disabled}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
