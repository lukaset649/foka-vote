import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { adminLogin } from '../../services/adminAuth';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

const AdminLoginPage = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setSubmitting(true);
    setError(false);

    const ok = await adminLogin(password);

    setSubmitting(false);
    if (ok) {
      void navigate('/admin/contests');
    } else {
      setError(true);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <i className="bi bi-box-arrow-in-right text-2xl text-indigo-600" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-zinc-900">Admin login</h1>
          </div>

          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            Log in
          </Button>

          {error && <Alert variant="error">Invalid password</Alert>}
        </form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
