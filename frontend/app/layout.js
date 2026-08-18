import './globals.css';
import SideNav from '@/components/layout/SideNav';

export const metadata = {
  title: 'Work Station Panel',
  description: 'Personal AI workstation management panel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <SideNav />
          <main className="layout__main">{children}</main>
        </div>
      </body>
    </html>
  );
}
