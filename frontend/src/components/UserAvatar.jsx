import React from 'react';
import { Crown, ShieldCheck, GraduationCap, User as UserIcon } from 'lucide-react';

const UserAvatar = ({ user, size = 'md', showBadge = true, className = '' }) => {
  const name = user?.name || 'User';
  const role = user?.role || 'Student';
  const initial = name.charAt(0).toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const badgeSizeClasses = {
    xs: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 p-0.5',
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-0.5',
    md: 'w-4 h-4 -bottom-1 -right-1 p-0.5',
    lg: 'w-5 h-5 -bottom-1 -right-1 p-1',
    xl: 'w-6 h-6 -bottom-1 -right-1 p-1'
  };

  const roleStyles = {
    Admin: {
      gradient: 'from-amber-500 via-primary-600 to-indigo-600 text-white font-extrabold',
      ring: 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/25',
      badgeBg: 'bg-slate-950 border border-amber-400/60 text-amber-300 shadow-md',
      icon: Crown
    },
    Staff: {
      gradient: 'from-indigo-500 via-sky-600 to-blue-600 text-white font-bold',
      ring: 'ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20',
      badgeBg: 'bg-slate-950 border border-sky-400/60 text-sky-300 shadow-md',
      icon: ShieldCheck
    },
    Student: {
      gradient: 'from-emerald-500 via-teal-600 to-cyan-600 text-white font-bold',
      ring: 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20',
      badgeBg: 'bg-slate-950 border border-emerald-400/60 text-emerald-300 shadow-md',
      icon: GraduationCap
    }
  };

  const currentRoleStyle = roleStyles[role] || roleStyles.Student;
  const BadgeIcon = currentRoleStyle.icon;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`rounded-full bg-gradient-to-tr ${currentRoleStyle.gradient} ${currentRoleStyle.ring} ${sizeClasses[size]} flex items-center justify-center font-black tracking-wider uppercase select-none transition-all duration-200`}
        title={`${name} (${role})`}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {showBadge && (
        <div
          className={`absolute rounded-full ${currentRoleStyle.badgeBg} ${badgeSizeClasses[size]} flex items-center justify-center z-10`}
          title={role}
        >
          <BadgeIcon className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
