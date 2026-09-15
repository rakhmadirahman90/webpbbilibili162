import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { broadcastDataChange } from '../utils/realtimeHelper';
import Swal from 'sweetalert2';
import { 
  Loader2, Send, CheckCircle2, User, Phone, 
  MapPin, Award, ChevronDown, 
  Users, Trophy, ArrowLeft, ArrowRight, UploadCloud, X,
  Mail, Lock, Eye, EyeOff, UserPlus, ShieldCheck, Sparkles, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// NOTE: preserve the existing registration implementation while exposing a
// consistent home navigation affordance on the standalone registration page.
