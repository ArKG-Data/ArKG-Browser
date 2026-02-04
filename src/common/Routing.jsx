import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../Pages/HomePage/Home";
import QueriesPage from "../Pages/QueriesPage/Queries";
import AboutPage from "../Pages/AboutPage/About";
import Navbar from "../Components/Navbar/Navbar";
import GraphPage from "../Pages/GraphPage/Graph";
import DataPage from "../Pages/DataPage/Data";
import MapPage from "../Pages/Map/Page";

function Routing (){
    return (
        <>
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path={'/'} element={<HomePage/>}></Route>
                <Route path={'/queries'} element={<QueriesPage/>}></Route>
                <Route path={'/graph'} element={<GraphPage></GraphPage>}></Route>
                <Route path={'/data'} element={<DataPage></DataPage>}></Route>
	    	<Route path={'/map'} element={<MapPage/>}></Route>
                <Route path={'/about'} element={<AboutPage/>}></Route>
            </Routes>
        </BrowserRouter>
        </>
    )
}

export default Routing; 
