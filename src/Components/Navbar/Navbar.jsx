import { Link } from 'react-router-dom';
import logo from "../../assets/home.svg"
import "./Navbar.css"

const Navbar = () => {

  return (
    <div className="navbar-container">

        <div className="logo">
          <Link style={{paddingLeft: "6px"}} to="/">
            <img src={logo}></img>
          </Link>
        </div>

        <Link to="/news">News</Link>
        <Link to="/queries">Queries</Link>
        <Link to="/graph">Graph</Link>
        <Link to="/data">Data</Link>
        <Link to="/about">About</Link>


    </div>
  );
};


export default Navbar;