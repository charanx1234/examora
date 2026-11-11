import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { AppView } from '../types/examora.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { generateEmailDefaultAvatar, getUserAvatarUrl } from '../utils/avatar.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface PersonalProfilePageProps {
  onNavigate: (view: AppView) => void;
}

export function PersonalProfilePage({ onNavigate }: PersonalProfilePageProps) {
  const { profile, updateProfileInfo } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || '');
  const [age, setAge] = useState<string>(
    profile?.age !== undefined && profile?.age !== null ? String(profile.age) : ''
  );
  const [gender, setGender] = useState(profile?.gender || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [academicLevel, setAcademicLevel] = useState(
    profile?.academicLevel || 'University / Undergraduate'
  );
  const [targetGoal, setTargetGoal] = useState(profile?.targetGoal || 'Honors Mastery');
  const [preferredDifficulty, setPreferredDifficulty] = useState<
    'Easy' | 'Medium' | 'Hard' | 'Expert'
  >(profile?.preferredDifficulty || 'Medium');
  const [bio, setBio] = useState(profile?.bio || '');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setAvatarUrl(profile.avatarUrl || null);
      setDateOfBirth(profile.dateOfBirth || '');
      setAge(profile.age !== undefined && profile.age !== null ? String(profile.age) : '');
      setGender(profile.gender || '');
      setInstitution(profile.institution || '');
      setDepartment(profile.department || '');
      setAcademicLevel(profile.academicLevel || 'University / Undergraduate');
      setTargetGoal(profile.targetGoal || 'Honors Mastery');
      setPreferredDifficulty(profile.preferredDifficulty || 'Medium');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Automatically calculate Age when Date of Birth changes
  const handleDateOfBirthChange = (dobValue: string) => {
    setDateOfBirth(dobValue);
    if (dobValue) {
      const dobDate = new Date(dobValue);
      if (!Number.isNaN(dobDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 5 && calculatedAge <= 120) {
          setAge(String(calculatedAge));
        }
      }
    }
  };

  // Compress and resize uploaded profile picture to a clean 256x256 JPEG data URI
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Center-crop square
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(dataUrl);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefaultEmailAvatar = () => {
    setAvatarUrl(null);
    setStatusMsg(
      'Reset to your default email profile avatar. Click "Save Personal Information" to persist.'
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    setSaving(true);
    const parsedAge = age.trim() === '' ? null : Math.max(5, Math.min(120, Number(age)));
    const outcome = await updateProfileInfo({
      fullName: fullName.trim(),
      avatarUrl: avatarUrl || null,
      age: parsedAge,
      dateOfBirth: dateOfBirth.trim() || null,
      gender: gender.trim() || null,
      institution: institution.trim() || null,
      department: department.trim() || null,
      bio: bio.trim() || null,
      academicLevel,
      targetGoal: targetGoal.trim() || 'Honors Mastery',
      preferredDifficulty,
    });
    setSaving(false);

    if (!outcome.ok) {
      setErrorMsg(outcome.error || 'Could not update personal information.');
      return;
    }

    setStatusMsg('Your personal information and profile photo have been saved to PostgreSQL.');
  };

  const previewAvatar = getUserAvatarUrl({
    avatarUrl,
    email: profile?.email,
    fullName: fullName || profile?.fullName,
  });

  const isUsingEmailDefault = !avatarUrl || avatarUrl.trim().length === 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Scholar Identity · Profile Photo, Personal Details & Academic Calibration
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Personal Information & Profile
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Update your name, profile photo, age, date of birth, and academic details at any time. If no custom photo is set, your default email avatar is used automatically.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onNavigate('settings')}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy, Data Export & Account Settings</span>
        </Button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs font-medium text-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile Picture Studio & Identity Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Profile Picture
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isUsingEmailDefault
                  ? 'Currently using your default email profile avatar'
                  : 'Custom profile photo active'}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative group">
                  <img
                    src={previewAvatar}
                    alt={fullName || 'Scholar'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = generateEmailDefaultAvatar(profile?.email, fullName);
                    }}
                    className="w-28 h-28 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md hover:scale-105 transition-transform cursor-pointer"
                    title="Upload new profile photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {fullName || 'Scholar'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {profile?.email}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Custom Photo</span>
                </Button>

                {!isUsingEmailDefault && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResetToDefaultEmailAvatar}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Use Default Email Avatar</span>
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                If you do not upload a photo, EXAMORA automatically generates a clean default avatar from your email initials.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Account Summary
              </h3>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Account Email</span>
                <span className="font-mono text-slate-900 dark:text-white truncate max-w-[180px]">
                  {profile?.email}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Age / DOB</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {age ? `${age} yrs` : 'Not set'} {dateOfBirth ? `· ${dateOfBirth}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Scholar ID</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                  {profile?.uid}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable Personal & Academic Information */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Personal Details
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your personal identity details stored in the PostgreSQL `users` table—editable anytime.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address (Primary Login ID)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g., 21"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    University / College / School
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g., Indian Institute of Technology / Oxford"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                    />
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Examination Preferences Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Academic Profile & Examination Calibration
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used by EXAMORA to calibrate question rigor, marking rubrics, and study recommendations.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Department / Major / Branch
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Computer Science & Artificial Intelligence"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Academic Level
                  </label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  >
                    <option value="High School / Secondary">High School / Secondary</option>
                    <option value="University / Undergraduate">University / Undergraduate</option>
                    <option value="Postgraduate / Master's">Postgraduate / Master&apos;s</option>
                    <option value="Doctoral / Research">Doctoral / Research</option>
                    <option value="Competitive Examination Aspirant">
                      Competitive Examination Aspirant
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Examination Goal
                  </label>
                  <input
                    type="text"
                    value={targetGoal}
                    onChange={(e) => setTargetGoal(e.target.value)}
                    placeholder="e.g., Semester Honors Mastery / GATE / GRE"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Default Examination Difficulty
                  </label>
                  <select
                    value={preferredDifficulty}
                    onChange={(e) =>
                      setPreferredDifficulty(
                        e.target.value as 'Easy' | 'Medium' | 'Hard' | 'Expert'
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  >
                    <option value="Easy">Easy (Foundational Recall)</option>
                    <option value="Medium">Medium (Standard University Rigor)</option>
                    <option value="Hard">Hard (Advanced Analytical)</option>
                    <option value="Expert">Expert (Olympiad / Honours Level)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Bio / Current Study Focus
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a brief note about your current courses, upcoming exams, or learning goals..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Personal Information</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
