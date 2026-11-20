import { useState } from 'react';
import { User, Lock, KeyRound, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSettings() {
  const { user } = useAuth();

  const role = user?.role || 'manager';

  const roleMeta = {
    manager: {
      label: 'Property Manager',
      badge: 'info',
      scope: 'Sunrise Residency, Harborview Lofts, Metro Business Park, Green Valley Villas',
      defaultName: 'Sarah Jenkins',
      defaultEmail: 'manager@rentlock.com',
      defaultPhone: '+1 (718) 555-0192',
    },
    owner: {
      label: 'Property Owner',
      badge: 'purple',
      scope: 'Sunrise Residency, Green Valley Villas, Metro Business Park',
      defaultName: 'Claire Bennett',
      defaultEmail: 'owner@rentlock.com',
      defaultPhone: '+1 (212) 555-0144',
    },
    tenant: {
      label: 'Resident Tenant',
      badge: 'success',
      scope: 'Sunrise Residency · Unit A-204',
      defaultName: 'Rebecca Miller',
      defaultEmail: 'tenant@rentlock.com',
      defaultPhone: '+1 (718) 555-0188',
    },
  }[role] || {
    label: 'User',
    badge: 'gray',
    scope: 'Assigned Scope',
    defaultName: user?.name || 'User',
    defaultEmail: user?.email || '',
    defaultPhone: '+1 (555) 000-0000',
  };

  const [activeTab, setActiveTab] = useState('profile');

  // Personal Info Form State
  const [name, setName] = useState(user?.name || roleMeta.defaultName);
  const [email] = useState(user?.email || roleMeta.defaultEmail);
  const [phone, setPhone] = useState(user?.phone || roleMeta.defaultPhone);
  const [isSaving, setIsSaving] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedUser = {
        ...user,
        name,
        phone,
      };
      localStorage.setItem('pm_user', JSON.stringify(updatedUser));
      setTimeout(() => {
        setIsSaving(false);
        toast.success('Profile details saved successfully!');
      }, 300);
    } catch {
      setIsSaving(false);
      toast.error('Failed to save profile changes');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully in database!');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Settings & Profile"
        subtitle="Manage your personal profile details and security credentials."
        breadcrumbs={[{ label: 'Home' }, { label: 'Settings' }]}
      />

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'password'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Avatar & Overview */}
        <Card className="p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-md">
            {name.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{email}</p>
          </div>
          <div>
            <Badge variant={roleMeta.badge} className="px-3 py-1 text-xs">
              {roleMeta.label}
            </Badge>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-left text-xs text-gray-600 space-y-1">
            <span className="font-semibold text-gray-800">Account Scope:</span>
            <p className="text-[11px] text-gray-500">{roleMeta.scope}</p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Account Active & Secure</span>
          </div>
        </Card>

        {/* Right Columns: Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          {(activeTab === 'profile') && (
            <Card className="p-6 space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <User className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
                    <p className="text-[11px] text-gray-500">Update your account display name and phone number.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Primary Email (Login ID)"
                    value={email}
                    disabled
                    helperText="Email is managed by platform administrator"
                  />
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (xxx) xxx-xxxx"
                  />
                  <Input
                    label="Account Role"
                    value={roleMeta.label}
                    disabled
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <Button
                    type="submit"
                    icon={Save}
                    loading={isSaving}
                    className="px-6"
                  >
                    Save Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Change Password Card */}
          <Card className="p-6 space-y-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                  <p className="text-[11px] text-gray-500">Set a new strong password to protect your account.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Current Password *"
                    type="password"
                    icon={Lock}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <Input
                  label="New Password *"
                  type="password"
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  helperText="Must be at least 6 characters"
                  required
                />
                <Input
                  label="Confirm New Password *"
                  type="password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button
                  type="submit"
                  icon={KeyRound}
                  loading={isUpdatingPassword}
                  className="px-6"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
