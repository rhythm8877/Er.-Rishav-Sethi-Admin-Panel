import Blogs from '../Blogs/Blogs';
import Users from '../Users/Users';
import Events from '../Events/Events';
import Connect from '../Connect/Connect';
import Carousel from '../Carousel/Carousel';
import './Dashboard.css';

const Dashboard = ({ activeSection }) => {
  const renderPlaceholder = (title) => (
    <div className="placeholder-card">
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-subtitle">This section will be available soon.</p>
    </div>
  );

  return (
    <div className="dashboard">
      {activeSection === 'users' && <Users />}
      {activeSection === 'blogs' && <Blogs />}
      {activeSection === 'events' && <Events />}
      {activeSection === 'connect' && <Connect />}
      {activeSection === 'carousel' && <Carousel />}
    </div>
  );
};

export default Dashboard;

