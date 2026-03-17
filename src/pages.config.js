/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccountsReceivable from './pages/AccountsReceivable';
import AdminDataCleanup from './pages/AdminDataCleanup';
import AdminUsers from './pages/AdminUsers';
import BudgetCreate from './pages/BudgetCreate';
import BudgetDashboard from './pages/BudgetDashboard';
import BudgetDetail from './pages/BudgetDetail';
import BudgetRequests from './pages/BudgetRequests';
import Budgets from './pages/Budgets';
import Client from './pages/Client';
import ClientBudgetRequest from './pages/ClientBudgetRequest';
import ClientCreate from './pages/ClientCreate';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Financial from './pages/Financial';
import FinancialCreate from './pages/FinancialCreate';
import FinancialDetail from './pages/FinancialDetail';
import LayoutEditor from './pages/LayoutEditor';
import Production from './pages/Production';
import ReceiptCreate from './pages/ReceiptCreate';
import ReceiptDetail from './pages/ReceiptDetail';
import Receipts from './pages/Receipts';
import SettingsPage from './pages/SettingsPage';
import WorkOrderCreate from './pages/WorkOrderCreate';
import WorkOrderDashboard from './pages/WorkOrderDashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrders from './pages/WorkOrders';
import ClientPortal from './pages/ClientPortal';
import ClientBudgets from './pages/ClientBudgets';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountsReceivable": AccountsReceivable,
    "AdminDataCleanup": AdminDataCleanup,
    "AdminUsers": AdminUsers,
    "BudgetCreate": BudgetCreate,
    "BudgetDashboard": BudgetDashboard,
    "BudgetDetail": BudgetDetail,
    "BudgetRequests": BudgetRequests,
    "Budgets": Budgets,
    "Client": Client,
    "ClientBudgetRequest": ClientBudgetRequest,
    "ClientCreate": ClientCreate,
    "ClientDetail": ClientDetail,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "Financial": Financial,
    "FinancialCreate": FinancialCreate,
    "FinancialDetail": FinancialDetail,
    "LayoutEditor": LayoutEditor,
    "Production": Production,
    "ReceiptCreate": ReceiptCreate,
    "ReceiptDetail": ReceiptDetail,
    "Receipts": Receipts,
    "SettingsPage": SettingsPage,
    "WorkOrderCreate": WorkOrderCreate,
    "WorkOrderDashboard": WorkOrderDashboard,
    "WorkOrderDetail": WorkOrderDetail,
    "WorkOrders": WorkOrders,
    "ClientPortal": ClientPortal,
    "ClientBudgets": ClientBudgets,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};