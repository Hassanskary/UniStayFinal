import { useContext } from "react";
import { CompareHomesContext } from "./CompareHomesContext";

const useCompareHomes = () => {
    return useContext(CompareHomesContext);
};

export default useCompareHomes;
