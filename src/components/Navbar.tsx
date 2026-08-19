import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Globe, ChevronDown, Menu, X, MapPin, UserPlus, Wallet, FileText, 
  Trophy, BrainCircuit, ArrowLeft, Youtube, Instagram, Facebook, Twitter, 
  Radio, LogIn, LayoutDashboard, UserCheck, LogOut, Timer, HelpCircle, 
  RefreshCw, Info, Users, Award, Image as ImageIcon, Building2, 
  Target, Shield, Newspaper, Sparkles
} from 'lucide-react';
import { supabase } from '../supabase'; 
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';

// The rest of this component intentionally keeps the existing UI/navigation
// implementation. The realtime channel below is the only lifecycle change:
// callbacks are registered before subscribe and the channel name is unique.
