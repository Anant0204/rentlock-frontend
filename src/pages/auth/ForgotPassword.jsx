import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-6">We&apos;ve sent password reset instructions to <strong>{email}</strong></p>
        <Button variant="secondary" onClick={() => navigate('/login')} icon={ArrowLeft}>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Login
      </button>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h2>
      <p className="text-sm text-gray-500 mb-8">Enter your email and we&apos;ll send you reset instructions.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email Address" type="email" icon={Mail} required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} />
        <Button type="submit" fullWidth size="lg">Send Reset Link</Button>
      </form>
    </div>
  );
}
