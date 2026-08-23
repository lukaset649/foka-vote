import { Outlet } from 'react-router';

const Layout = () => {
  return (
    <>
      <header>
        <p>FOKA Vote</p>
      </header>
      <Outlet />
    </>
  );
};

export default Layout;
