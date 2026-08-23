import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { adminLogin } from '../../services/adminAuth';

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
    <form onSubmit={handleSubmit}>
      <label htmlFor="admin-password">Password</label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={submitting}>
        Log in
      </button>
      {error && <p role="alert">Invalid password</p>}
    </form>
  );
};

export default AdminLoginPage;
