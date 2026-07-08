import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";

import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

// Notifications globales
import { ToastProvider } from "./components/iu/Toast/ToastProvider";

// Composants globaux
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

// Pages publiques
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Logout from "./pages/Logout/Logout";
import Search from "./pages/Search/Search";
import EventDetail from "./pages/EventDetail/EventDetail";

// Onboarding (après inscription)
import OnboardingInterests from "./pages/Onboarding/OnboardingInterests";
import Profile from "./pages/Profile/Profile";

// Pages utilisateur
import HomeUser from "./pages/HomeUser/HomeUser";
import MyReservations from "./pages/MyReservations/MyReservations";
import DevenirOrganisateur from "./pages/DevenirOrganisateur/DevenirOrganisateur";

//import Booking from "./pages/Booking/Booking";

// Pages organisateur
import HomeOrganizer from "./pages/HomeOrganizer/HomeOrganizer";
import OrganizerEvents from "./pages/OrganizerEvents/OrganizerEvents";
import OrganizerDrafts from "./pages/OrganizerDrafts/OrganizerDrafts";
import CreateEvent from "./pages/CreateEvent/CreateEvent";
import EditEvent from "./pages/EditEvent/EditEvent";

// Pages admin
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminOverview from "./pages/Admin/AdminOverview";
import AdminDemandes from "./pages/Admin/AdminDemandes";
import AdminRoute from "./components/AdminRoute/AdminRoute";
import AdminEvents from "./pages/Admin/AdminEvents";

import "./App.css";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route path="/" element={<HomeRouter />} />
          <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
          <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/forgot-password" element={<Placeholder name="Mot de passe oublié" />} />
          <Route path="/discover" element={<Placeholder name="Découvrir" />} />
          <Route path="/search" element={<Search />} />
          <Route path="/contact" element={<Placeholder name="Contact" />} />
          <Route path="/event/:id" element={<EventDetail />} />

          {/* ONBOARDING */}
          <Route path="/onboarding/interests" element={
            <ProtectedRoute><OnboardingInterests /></ProtectedRoute>
          } />

          {/* UTILISATEUR */}
          <Route path="/home" element={
            <ProtectedRoute><HomeUser /></ProtectedRoute>
          } />
          <Route path="/my-reservations" element={
            <ProtectedRoute><MyReservations /></ProtectedRoute>
          } />
          {/*<Route path="/booking/:id" element={
            <ProtectedRoute><Booking /></ProtectedRoute>
          } />*/}
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/devenir-organisateur" element={
            <DevenirOrganisateur />
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Placeholder name="Paramètres" /></ProtectedRoute>
          } />

          {/* ORGANISATEUR */}
          <Route path="/dashboard" element={
            <ProtectedRoute requireOrganisateur><HomeOrganizer /></ProtectedRoute>
          } />
          <Route path="/organizer" element={
            <ProtectedRoute requireOrganisateur><OrganizerEvents /></ProtectedRoute>
          } />
          <Route path="/organizer/drafts" element={
            <ProtectedRoute requireOrganisateur><OrganizerDrafts /></ProtectedRoute>
          } />
          <Route path="/organizer/create" element={
            <ProtectedRoute requireOrganisateur><CreateEvent /></ProtectedRoute>
          } />
          <Route path="/organizer/edit/:id" element={
            <ProtectedRoute requireOrganisateur><EditEvent /></ProtectedRoute>
          } />
          <Route path="/organizer/stats/:id" element={
            <ProtectedRoute requireOrganisateur><Placeholder name="Statistiques événement" /></ProtectedRoute>
          } />

          {/* ADMIN - Dashboard avec sous-routes */}
          <Route path="/admin" element={
            <AdminRoute><AdminLayout /></AdminRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="demandes" element={<AdminDemandes />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="users" element={<Placeholder name="Gestion utilisateurs" />} />
            <Route path="categories" element={<Placeholder name="Gestion catégories" />} />
          </Route>

          {/* LEGAL & ENTREPRISE */}
          <Route path="/legal/cgu" element={<Placeholder name="CGU" />} />
          <Route path="/legal/privacy" element={<Placeholder name="Confidentialité" />} />
          <Route path="/legal/cookies" element={<Placeholder name="Cookies" />} />
          <Route path="/legal/mentions" element={<Placeholder name="Mentions légales" />} />
          <Route path="/about" element={<Placeholder name="À propos" />} />
          <Route path="/blog" element={<Placeholder name="Blog" />} />
          <Route path="/careers" element={<Placeholder name="Carrières" />} />
          <Route path="/pricing" element={<Placeholder name="Tarifs" />} />
          <Route path="/tools" element={<Placeholder name="Outils" />} />
          <Route path="/testimonials" element={<Placeholder name="Témoignages" />} />

          <Route path="*" element={<Placeholder name="Page introuvable (404)" />} />
        </Routes>
      </main>
      <Footer />
      
    </>
  );
}

// Redirige vers la home selon le rôle
function HomeRouter() {
  const { user, isAuthenticated, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isAuthenticated) return <LandingPage />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.is_organisateur) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/home" replace />;
}

// Utilisateurs connectés ne peuvent pas accéder à login/register
function RedirectIfAuth({ children }) {
  const { isAuthenticated, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function Placeholder({ name }) {
  return (
    <div className="container" style={{ padding: "100px 24px", textAlign: "center", minHeight: "60vh" }}>
      <h1 className="text-serif" style={{ fontSize: 48, marginBottom: 8 }}>{name}</h1>
      <p style={{ color: "var(--color-text-muted)" }}>Cette page sera créée bientôt.</p>
    </div>
  );
}

