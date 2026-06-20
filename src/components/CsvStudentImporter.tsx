import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Check, AlertTriangle, Trash2, Edit2, 
  Save, Download, Sparkles, RefreshCw, X, CheckCircle2 
} from 'lucide-react';
import { Student, ClassStream } from '../types';

interface CsvStudentImporterProps {
  students: Student[];
  onImportStudents: (newStudents: Student[]) => void;
  onLogPayload: (
    type: 'HTMX' | 'SSR' | 'SYSTEM',
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    payload: string,
    response: string
  ) => void;
}

interface ParsedRow {
  id: string; // temp unique index
  name: string;
  gender: string;
  parentName: string;
  parentPhone: string;
  classStream: string;
  pin: string;
  isValid: boolean;
  errors: string[];
}

const ALLOWED_STREAMS: ClassStream[] = [
  'P.5 Blue', 'P.5 Gold', 'P.6 Green', 'P.6 Red', 'P.7 Eagle', 'P.7 Lion'
];

export default function CsvStudentImporter({
  students,
  onImportStudents,
  onLogPayload
}: CsvStudentImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [importCompletedCount, setImportCompletedCount] = useState<number | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  
  // Edit Fields
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editClassStream, setEditClassStream] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = 
      "Name,Gender,Parent Name,Parent Phone,Class Stream\n" +
      "Moses Kirabo,Male,Sarah Luzinda,0772123456,P.5 Blue\n" +
      "Daphne Atwine,Female,Dr. Julius Atwine,0701456789,P.5 Gold\n" +
      "Aaron Wasswa,Male,Arthur Kato,0782987654,P.6 Green\n" +
      "Patricia Nabunya,Female,Mark Nabunya,0711998877,P.7 Eagle";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "kampala_academic_students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onLogPayload(
      'SYSTEM',
      'GET',
      '/portal/admin/dowload-csv-template/',
      '',
      '<!-- CSV Template downloaded -->\nReturned active template containing predefined ClassStream validators: P.5 Blue, P.5 Gold, P.6 Green, P.6 Red, P.7 Eagle, P.7 Lion.'
    );
  };

  // Safe auto PIN generator
  const generateUniquePin = (existingPins: string[]): string => {
    let pin = '';
    let isUnique = false;
    while (!isUnique) {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
      if (!existingPins.includes(pin)) {
        isUnique = true;
      }
    }
    return pin;
  };

  // Helper row validator
  const validateRow = (
    name: string, 
    gender: string, 
    parentName: string, 
    parentPhone: string, 
    classStream: string
  ) => {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push("Missing student name");
    }
    
    const formattedGender = gender.trim().toLowerCase();
    if (formattedGender !== 'male' && formattedGender !== 'female' && formattedGender !== 'm' && formattedGender !== 'f') {
      errors.push("Gender must be 'Male' or 'Female'");
    }
    
    if (!parentName.trim()) {
      errors.push("Missing parent contact name");
    }
    
    if (!parentPhone.trim()) {
      errors.push("Missing parent phone contact");
    }
    
    const matchesStream = ALLOWED_STREAMS.some(
      stream => stream.toLowerCase() === classStream.trim().toLowerCase()
    );
    if (!matchesStream) {
      errors.push(`Invalid Stream. Allowed: ${ALLOWED_STREAMS.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Custom client-side CSV Parser
  const parseCSVRawText = (text: string) => {
    setErrorHeader(null);
    setImportCompletedCount(null);
    // Handle lines split by CRLF or LF
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 1 || !lines[0].trim()) {
      setErrorHeader("The CSV spreadsheet is empty or has no content rows.");
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, '').toLowerCase());
    
    // Check for standard expected column keys
    const nameIndex = headers.indexOf('name');
    const genderIndex = headers.indexOf('gender');
    const parentNameIndex = headers.findIndex(h => h.includes('parent') && h.includes('name')) !== -1 
      ? headers.findIndex(h => h.includes('parent') && h.includes('name')) 
      : headers.indexOf('parent name');
    const parentPhoneIndex = headers.findIndex(h => h.includes('parent') && h.includes('phone')) !== -1 
      ? headers.findIndex(h => h.includes('parent') && h.includes('phone')) 
      : headers.indexOf('parent phone');
    const streamIndex = headers.findIndex(h => h.includes('class') || h.includes('stream')) !== -1 
      ? headers.findIndex(h => h.includes('class') || h.includes('stream')) 
      : headers.indexOf('class stream');

    if (nameIndex === -1 || genderIndex === -1) {
      setErrorHeader("Invalid headers! Your CSV columns must contain at least 'Name', 'Gender', 'Parent Name', 'Parent Phone', 'Class Stream' headers.");
      return;
    }

    const rows: ParsedRow[] = [];
    const existingPins = students.map(s => s.pin);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // skip blank rows

      // Robust CSV cell parser handling commas inside quoted strings if present
      let cells: string[] = [];
      let inQuotes = false;
      let currentCell = '';
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());

      // Read cells matching standard indexes
      const name = cells[nameIndex] ? cells[nameIndex].replace(/['"]/g, '') : '';
      const genderRaw = cells[genderIndex] ? cells[genderIndex].replace(/['"]/g, '') : '';
      const parentName = parentNameIndex !== -1 && cells[parentNameIndex] ? cells[parentNameIndex].replace(/['"]/g, '') : '';
      const parentPhone = parentPhoneIndex !== -1 && cells[parentPhoneIndex] ? cells[parentPhoneIndex].replace(/['"]/g, '') : '';
      const streamRaw = streamIndex !== -1 && cells[streamIndex] ? cells[streamIndex].replace(/['"]/g, '') : '';

      // Normalize Gender Value for state compatibility
      let gender: 'Male' | 'Female' = 'Male';
      const normGen = genderRaw.toLowerCase();
      if (normGen === 'female' || normGen === 'f') {
        gender = 'Female';
      }

      // Find best matched case-sensitive class stream
      let classStream = ALLOWED_STREAMS.find(
        stream => stream.toLowerCase() === streamRaw.toLowerCase()
      ) || streamRaw as ClassStream;

      const { isValid, errors } = validateRow(name, genderRaw, parentName, parentPhone, streamRaw);
      const rowPin = generateUniquePin(existingPins);
      existingPins.push(rowPin); // ensure preview duplicates aren't generated

      rows.push({
        id: `csv-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name,
        gender,
        parentName,
        parentPhone,
        classStream,
        pin: rowPin,
        isValid,
        errors
      });
    }

    if (rows.length === 0) {
      setErrorHeader("No student profiles detected in the body of the CSV sheet.");
    } else {
      setParsedRows(rows);
      
      onLogPayload(
        'HTMX',
        'POST',
        '/portal/admin/parse-student-csv/',
        `lines_processed=${lines.length}&students_found=${rows.length}`,
        `<!-- Parsed CSV Preview Table -->\n<div class="alert bg-slate-100 text-slate-800 p-2 font-mono text-xs">Django CSV parse backend successfully generated ${rows.length} rows with auto PINs. Check integrity grid before committing.</div>`
      );
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorHeader(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            parseCSVRawText(event.target.result);
          }
        };
        reader.readAsText(file);
      } else {
        setErrorHeader("Invalid file type. Please upload a structured .csv spreadsheet file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorHeader(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          parseCSVRawText(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  // Interactive inline editing functions
  const startEditing = (row: ParsedRow) => {
    setEditingRowId(row.id);
    setEditName(row.name);
    setEditGender(row.gender);
    setEditParentName(row.parentName);
    setEditParentPhone(row.parentPhone);
    setEditClassStream(row.classStream);
  };

  const cancelEditing = () => {
    setEditingRowId(null);
  };

  const saveEditedRow = (id: string) => {
    // Save state back to rows
    const updatedRows = parsedRows.map(row => {
      if (row.id === id) {
        // Verify stream match
        const matchedStream = ALLOWED_STREAMS.find(
          stream => stream.toLowerCase() === editClassStream.trim().toLowerCase()
        ) || editClassStream as ClassStream;

        let genderVal: 'Male' | 'Female' = 'Male';
        if (editGender.trim().toLowerCase() === 'female' || editGender.trim().toLowerCase() === 'f') {
          genderVal = 'Female';
        }

        const { isValid, errors } = validateRow(
          editName, 
          editGender, 
          editParentName, 
          editParentPhone, 
          matchedStream
        );

        return {
          ...row,
          name: editName.trim(),
          gender: genderVal,
          parentName: editParentName.trim(),
          parentPhone: editParentPhone.trim(),
          classStream: matchedStream,
          isValid,
          errors
        };
      }
      return row;
    });

    setParsedRows(updatedRows);
    setEditingRowId(null);
  };

  const deleteRow = (id: string) => {
    setParsedRows(parsedRows.filter(row => row.id !== id));
  };

  // Commit dynamic parsed students list to Main App State
  const handleCommitImports = () => {
    const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;
    if (invalidRowsCount > 0) {
      setErrorHeader(`Cannot import! You have ${invalidRowsCount} row(s) with validation errors. Please edit/correct them or delete the problematic rows first.`);
      return;
    }

    if (parsedRows.length === 0) {
      setErrorHeader("No student profiles are available to import. Upload a file first.");
      return;
    }

    // Convert preview ParsedRows to Student items
    // Safe ID auto-increment matching the native schema (e.g. s7, s8...)
    let currentMaxNum = 0;
    students.forEach(s => {
      const matchNum = parseInt(s.id.replace('s', ''));
      if (!isNaN(matchNum) && matchNum > currentMaxNum) {
        currentMaxNum = matchNum;
      }
    });

    const newImportedStudents: Student[] = parsedRows.map((row, index) => {
      const numId = currentMaxNum + index + 1;
      return {
        id: `s${numId}`,
        name: row.name,
        gender: row.gender as 'Male' | 'Female',
        parentName: row.parentName,
        parentPhone: row.parentPhone,
        pin: row.pin,
        classStream: row.classStream as ClassStream,
        avatar: row.gender === 'Male' 
          ? `https://images.unsplash.com/photo-${1500000000000 + (index * 5432) % 1000000}?auto=format&fit=crop&w=150&q=80`
          : `https://images.unsplash.com/photo-${1510000000000 + (index * 9876) % 1000000}?auto=format&fit=crop&w=150&q=80`
      };
    });

    // Call callback to store in App component state
    onImportStudents(newImportedStudents);
    setImportCompletedCount(newImportedStudents.length);
    setParsedRows([]);
    setErrorHeader(null);

    // Create realistic bulk django postgres raw INSERT logs
    const sqlLogs = newImportedStudents.map(s => 
      `INSERT INTO django_students (id, name, gender, parent_name, parent_phone, pin, class_stream) VALUES ('${s.id}', '${s.name.replace(/'/g, "''")}', '${s.gender}', '${s.parentName.replace(/'/g, "''")}', '${s.parentPhone}', '${s.pin}', '${s.classStream}');`
    ).join('\n');

    onLogPayload(
      'SYSTEM',
      'POST',
      '/portal/admin/bulk-register-students/',
      `count=${newImportedStudents.length}&sql_count=${newImportedStudents.length}`,
      `<!-- Bulk Creation Complete -->\n<div class="bg-emerald-950 font-mono text-emerald-300 p-4 rounded text-[11px] leading-relaxed max-h-[150px] overflow-y-auto">\n${sqlLogs}\n</div>\n<span class="text-xs text-emerald-400 block font-bold mt-2">✓ ${newImportedStudents.length} student profiles and anti-forgery PINs committed to master SQL store successfully.</span>`
    );
  };

  return (
    <div id="csv-student-importer-container" className="bg-white rounded-xl shadow border border-slate-100 p-5 space-y-5">
      
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Upload size={16} className="text-indigo-600" />
            Bulk Pupil CSV Importer & PIN Generator
          </h3>
          <p className="text-[10px] text-slate-400">
            Upload student rosters in formats exported from Excel to instantly create credentials and official PIN codes.
          </p>
        </div>
        
        <button
          onClick={handleDownloadTemplate}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
        >
          <Download size={13} />
          <span>Get CSV Template</span>
        </button>
      </div>

      {importCompletedCount !== null && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 flex items-center gap-3 animate-fade-in">
          <div className="p-2 bg-emerald-500 text-white rounded-full">
            <CheckCircle2 size={16} />
          </div>
          <div className="flex-1">
            <h5 className="text-xs font-extrabold">Bulk Creation Completed Successfully</h5>
            <p className="text-[10px] text-emerald-700 font-semibold">
              Added <strong>{importCompletedCount}</strong> student profiles into active registers with dynamic credentials. View SQL execution log below in the HTMX console drawer.
            </p>
          </div>
          <button 
            onClick={() => setImportCompletedCount(null)}
            className="text-emerald-500 hover:text-emerald-800 p-1 rounded"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {errorHeader && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-900 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
          <div className="text-[11px] font-semibold flex-1">
            {errorHeader}
          </div>
          <button 
            onClick={() => setErrorHeader(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* DRAG AND DROP ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner' 
            : 'border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/50'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="hidden" 
        />
        
        <div className="flex flex-col items-center gap-2.5">
          <div className="p-3 bg-white rounded-full shadow border text-indigo-600">
            <Upload size={22} className="animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800">
              Drag your student roster file here, or <span className="text-indigo-600 hover:underline">browse files</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports .csv spreadsheets containing headers: Name, Gender, Parent Name, Parent Phone, Class Stream
            </p>
          </div>
        </div>
      </div>

      {/* CSV DATA PARSING INTEGRITY PREVIEW GRID */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-fade-in border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600 animate-spin" />
                Data integrity Verification sheet ({parsedRows.length} Rows parsed)
              </h4>
              <p className="text-[9px] text-slate-400">
                Correct any typos inline below and audit automatic PIN results prior to committing database execution.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setParsedRows([])}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                Clear Preview
              </button>
              <button
                onClick={handleCommitImports}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow shadow-indigo-600/20"
              >
                <Check size={14} />
                <span>Commit & Write {parsedRows.length} Pupils</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500">
                  <th className="p-3">Status</th>
                  <th className="p-3">Pupil Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Class stream</th>
                  <th className="p-3">Parent contact</th>
                  <th className="p-3">Generated PIN</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-sans text-slate-700">
                {parsedRows.map((row) => {
                  const isEditing = editingRowId === row.id;
                  
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        !row.isValid ? 'bg-rose-50/40 hover:bg-rose-50/60' : ''
                      }`}
                    >
                      {/* Status Column */}
                      <td className="p-3 font-semibold text-[10px]">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Valid Row
                          </span>
                        ) : (
                          <div className="group relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 cursor-help">
                            <AlertTriangle size={10} className="text-rose-500 animate-pulse" />
                            <span>Error(s)</span>
                            <div className="absolute left-0 top-6 hidden group-hover:block bg-slate-900 text-white text-[9px] p-2 rounded shadow-lg z-30 w-48 font-normal leading-normal select-none">
                              {row.errors.map((err, i) => (
                                <p key={i}>• {err}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Name Column */}
                      <td className="p-3 font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border rounded p-1 text-xs font-semibold w-full block focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          row.name
                        )}
                      </td>

                      {/* Gender Column */}
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            className="bg-white border rounded p-1 text-xs w-full block focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        ) : (
                          row.gender
                        )}
                      </td>

                      {/* Class Stream Column */}
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            value={editClassStream}
                            onChange={(e) => setEditClassStream(e.target.value)}
                            className="bg-white border rounded p-1 text-xs w-full block focus:ring-1 focus:ring-indigo-500"
                          >
                            {ALLOWED_STREAMS.map(stream => (
                              <option key={stream} value={stream}>{stream}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-mono border">
                            {row.classStream}
                          </span>
                        )}
                      </td>

                      {/* Parent Column */}
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editParentName}
                              placeholder="Parent Name"
                              onChange={(e) => setEditParentName(e.target.value)}
                              className="bg-white border rounded p-1 text-[11px] w-full block focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={editParentPhone}
                              placeholder="Parent Phone"
                              onChange={(e) => setEditParentPhone(e.target.value)}
                              className="bg-white border rounded p-1 text-[11px] w-full block focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <div className="leading-tight">
                            <p className="font-semibold text-slate-800">{row.parentName || "—"}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{row.parentPhone || "—"}</p>
                          </div>
                        )}
                      </td>

                      {/* Auto-generated PIN code */}
                      <td className="p-3">
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                          🔑 {row.pin}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => saveEditedRow(row.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-md transition-colors"
                              title="Save row"
                            >
                              <Save size={12} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded-md transition-colors"
                              title="Cancel editing"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEditing(row)}
                              className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-150 rounded"
                              title="Edit record"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-150 rounded"
                              title="Delete row"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
