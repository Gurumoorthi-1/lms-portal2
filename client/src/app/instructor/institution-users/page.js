'use client';

import React, { useState, useEffect } from 'react';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { 
  Upload, 
  Users, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Search,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/api';
import socket from '@/lib/socket';

export default function InstitutionUsersPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/institution/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch institutional users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Listen for real-time status changes
    const handleStatusChange = (data) => {
      console.log('Status change received:', data);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    socket.on('userStatusChanged', handleStatusChange);
    
    // Initial fetch of online users if needed (optional)
    // socket.emit('getOnlineUsers'); 

    return () => {
      socket.off('userStatusChanged', handleStatusChange);
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/institution/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully imported ${data.count} users!`);
        setFile(null);
        fetchUsers();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await authFetch('/institution/users', { method: 'DELETE' });
      if (res.ok) {
        toast.success('All institutional users deleted successfully.');
        setUsers([]);
        setShowConfirm(false);
      }
    } catch (err) {
      toast.error('Failed to delete users');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.institutionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
              Institutional Users
              <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest font-black">Secure CSV Flow</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">Bulk manage students for institutional login access.</p>
          </div>
          
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={users.length === 0 || isDeleting}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl border border-rose-100 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <Trash2 size={18} />
            {isDeleting ? 'Deleting...' : 'Wipe All Users'}
          </button>
        </div>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {showConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setShowConfirm(false)}
                 className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md border border-slate-100 overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                     <AlertCircle size={160} className="text-rose-500" />
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                     <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center">
                        <AlertCircle size={40} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">Destroy All Records?</h3>
                        <p className="text-slate-500 font-medium mt-2">
                           This will permanently delete <span className="text-slate-900 font-bold">{users.length} institutional students</span>. 
                           Access for these users will be immediately revoked.
                        </p>
                     </div>

                     <div className="w-full flex flex-col gap-3">
                        <button 
                          onClick={handleDeleteAll}
                          disabled={isDeleting}
                          className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-200 hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
                        >
                           {isDeleting ? 'Processing Wipe...' : 'Yes, Delete Everything'}
                           <Trash2 size={18} />
                        </button>
                        <button 
                          onClick={() => setShowConfirm(false)}
                          className="w-full h-14 bg-slate-50 text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all"
                        >
                           Cancel
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Card */}
          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Import CSV</h3>
             </div>

             <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center space-y-4">
                <input 
                  type="file" 
                  id="csv-upload" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <label htmlFor="csv-upload" className="cursor-pointer block">
                   <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                   <p className="text-sm font-bold text-slate-600">{file ? file.name : 'Click to select CSV file'}</p>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Format: institutionId, email, password</p>
                </label>
             </div>

             <button 
               onClick={handleUpload}
               disabled={!file || loading}
               className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {loading ? 'Processing...' : 'Upload & Sync DB'}
               <CheckCircle2 size={18} />
             </button>

             <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                  <ShieldCheck size={14} /> Security Note
                </div>
                <p className="text-[11px] text-blue-500 font-medium leading-relaxed">
                  Uploaded users are strictly for institutional login. Personal logins will remain unaffected.
                </p>
             </div>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900">Authorized Students ({users.length})</h3>
               <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search students..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {filteredUsers.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Username</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Institution ID</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isOnline = onlineUsers.has(user._id || user.id);
                      return (
                        <tr key={user._id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{user.username}</td>
                          <td className="px-6 py-4">
                             <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-600">{user.institutionId}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                          <td className="px-6 py-4">
                             <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                               <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                               {isOnline ? 'Active' : 'Offline'}
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-20 text-center space-y-3">
                  <AlertCircle className="mx-auto text-slate-200" size={48} />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No institutional users found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
