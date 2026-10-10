from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from events.models import Event, Categorie, Tag, TypeBillet
from users.models import User


# Coordonnées GPS précises de chaque ville
COORDS = {
    "Tunis":         (36.806495, 10.181530),
    "La Marsa":      (36.879780, 10.323890),
    "Sidi Bou Saïd": (36.872350, 10.348880),
    "Carthage":      (36.852540, 10.323320),
    "Hammamet":      (36.400000, 10.616667),
    "Sousse":        (35.825603, 10.636904),
    "Monastir":      (35.777500, 10.826111),
    "Sfax":          (34.740556, 10.760278),
    "Djerba":        (33.808888, 10.845833),
    "Nabeul":        (36.451111, 10.735556),
}

# Catégories à créer (avec icône Lucide et couleur)
CATEGORIES = [
    {"nom": "Musique",   "icone": "Music",      "couleur": "#EC4899"},
    {"nom": "Food",      "icone": "Utensils",   "couleur": "#F97316"},
    {"nom": "Art",       "icone": "Palette",    "couleur": "#84CC16"},
    {"nom": "Sport",     "icone": "Trophy",     "couleur": "#06B6D4"},
    {"nom": "Théâtre",   "icone": "Drama",      "couleur": "#A855F7"},
    {"nom": "Cinéma",    "icone": "Film",       "couleur": "#6366F1"},
    {"nom": "Tech",      "icone": "Cpu",        "couleur": "#0891B2"},
    {"nom": "Nightlife", "icone": "Moon",       "couleur": "#7C3AED"},
    {"nom": "Bien-être", "icone": "Heart",      "couleur": "#16A34A"},
    {"nom": "Famille",   "icone": "Users",      "couleur": "#F59E0B"},
]


# Les 30 événements à seed
EVENTS = [
    # MUSIQUE (6)
    {
        "titre": "Festival de Carthage 2026 — Soirée d'ouverture",
        "description": "La grande soirée d'ouverture du festival international de Carthage avec une programmation exceptionnelle d'artistes tunisiens et internationaux.",
        "ville": "Carthage", "lieu": "Théâtre antique de Carthage",
        "categorie": "Musique", "jours_dans_futur": 7,
        "tags": ["festival", "international", "musique"],
        "billets": [
            {"nom": "Standard", "prix": 80, "capacite": 800},
            {"nom": "VIP", "prix": 200, "capacite": 100},
        ],
    },
    {
        "titre": "Concert Saber Rebaï — Live à Tunis",
        "description": "L'icône de la musique tunisienne en concert exceptionnel. Une soirée pleine d'émotion et de souvenirs.",
        "ville": "Tunis", "lieu": "Le Colisée",
        "categorie": "Musique", "jours_dans_futur": 14,
        "tags": ["concert", "tunisien", "live"],
        "billets": [
            {"nom": "Standard", "prix": 50, "capacite": 500},
            {"nom": "Carré Or", "prix": 120, "capacite": 80},
        ],
    },
    {
        "titre": "Jazz à Sidi Bou Saïd",
        "description": "Soirée jazz dans le cadre magique de Sidi Bou Saïd avec vue sur la mer.",
        "ville": "Sidi Bou Saïd", "lieu": "Dar El Annabi",
        "categorie": "Musique", "jours_dans_futur": 5,
        "tags": ["jazz", "intimiste"],
        "billets": [
            {"nom": "Standard", "prix": 60, "capacite": 100, "bon_plan": True, "prix_original": 80},
        ],
    },
    {
        "titre": "Hammamet Sound Festival",
        "description": "3 jours, 30 artistes, sur la plage de Hammamet. La référence électro de l'été.",
        "ville": "Hammamet", "lieu": "Plage de Yasmine Hammamet",
        "categorie": "Musique", "jours_dans_futur": 21,
        "tags": ["festival", "electro", "plage"],
        "billets": [
            {"nom": "Pass 1 jour", "prix": 70, "capacite": 1500},
            {"nom": "Pass 3 jours", "prix": 180, "capacite": 800},
        ],
    },
    {
        "titre": "Soirée Mezoued à Sousse",
        "description": "Ambiance 100% tunisienne avec les meilleurs musiciens de mezoued.",
        "ville": "Sousse", "lieu": "Médina de Sousse",
        "categorie": "Musique", "jours_dans_futur": 3,
        "tags": ["traditionnel", "mezoued"],
        "billets": [
            {"nom": "Entrée", "prix": 25, "capacite": 200, "bon_plan": True, "prix_original": 40},
        ],
    },
    {
        "titre": "Opéra à Sfax — La Traviata",
        "description": "L'opéra de Verdi interprété par les artistes du Théâtre municipal de Tunis.",
        "ville": "Sfax", "lieu": "Théâtre municipal de Sfax",
        "categorie": "Musique", "jours_dans_futur": 30,
        "tags": ["opera", "classique"],
        "billets": [
            {"nom": "Balcon", "prix": 45, "capacite": 150},
            {"nom": "Orchestre", "prix": 90, "capacite": 200},
        ],
    },

    # FOOD (5)
    {
        "titre": "Festival Couscous & Traditions",
        "description": "Découvrez 30 variations du couscous tunisien préparées par les meilleurs chefs.",
        "ville": "Tunis", "lieu": "Parc du Belvédère",
        "categorie": "Food", "jours_dans_futur": 10,
        "tags": ["traditionnel", "famille"],
        "billets": [
            {"nom": "Pass dégustation", "prix": 35, "capacite": 500},
        ],
    },
    {
        "titre": "Brunch dominical à Sidi Bou Saïd",
        "description": "Brunch méditerranéen tout-inclus avec vue sur le golfe de Tunis.",
        "ville": "Sidi Bou Saïd", "lieu": "Café des Délices",
        "categorie": "Food", "jours_dans_futur": 4,
        "tags": ["brunch", "weekend"],
        "billets": [
            {"nom": "Adulte", "prix": 55, "capacite": 80},
            {"nom": "Enfant (-12 ans)", "prix": 30, "capacite": 30},
        ],
    },
    {
        "titre": "Soirée Poisson à Djerba",
        "description": "Dégustation de fruits de mer fraîchement pêchés au bord de la lagune.",
        "ville": "Djerba", "lieu": "Houmt Souk",
        "categorie": "Food", "jours_dans_futur": 12,
        "tags": ["poisson", "mer"],
        "billets": [
            {"nom": "Menu complet", "prix": 65, "capacite": 60, "bon_plan": True, "prix_original": 90},
        ],
    },
    {
        "titre": "Atelier pâtisseries orientales",
        "description": "Apprenez à préparer baklava, makroudh et kaak warka avec un chef pâtissier.",
        "ville": "Tunis", "lieu": "École culinaire Lemon",
        "categorie": "Food", "jours_dans_futur": 6,
        "tags": ["atelier", "patisserie"],
        "billets": [
            {"nom": "Participant", "prix": 80, "capacite": 15},
        ],
    },
    {
        "titre": "Street Food Festival Carthage",
        "description": "Food trucks, DJ sets et ambiance détendue. Plus de 20 stands.",
        "ville": "Carthage", "lieu": "Port Punique",
        "categorie": "Food", "jours_dans_futur": 8,
        "tags": ["street-food", "famille"],
        "billets": [
            {"nom": "Entrée libre", "prix": 0, "capacite": 1000},
        ],
    },

    # ART (4)
    {
        "titre": "Exposition Art Tunisien Contemporain",
        "description": "Découvrez 50 œuvres d'artistes tunisiens émergents.",
        "ville": "Tunis", "lieu": "B7L9 Art Station",
        "categorie": "Art", "jours_dans_futur": 2,
        "tags": ["exposition", "contemporain"],
        "billets": [
            {"nom": "Visite libre", "prix": 15, "capacite": 200},
            {"nom": "Visite guidée", "prix": 30, "capacite": 30},
        ],
    },
    {
        "titre": "Atelier calligraphie arabe",
        "description": "Initiation à l'art millénaire de la calligraphie arabe avec maître Hichem.",
        "ville": "La Marsa", "lieu": "Centre culturel de La Marsa",
        "categorie": "Art", "jours_dans_futur": 5,
        "tags": ["atelier", "calligraphie"],
        "billets": [
            {"nom": "Standard", "prix": 50, "capacite": 20},
        ],
    },
    {
        "titre": "Vernissage galerie El Marsa",
        "description": "Vernissage de la nouvelle exposition « Méditerranée ».",
        "ville": "Sidi Bou Saïd", "lieu": "Galerie El Marsa",
        "categorie": "Art", "jours_dans_futur": 9,
        "tags": ["vernissage", "peinture"],
        "billets": [
            {"nom": "Sur invitation", "prix": 0, "capacite": 150},
        ],
    },
    {
        "titre": "Festival du film documentaire de Sfax",
        "description": "Projections de documentaires tunisiens et arabes, en présence des réalisateurs.",
        "ville": "Sfax", "lieu": "Cinéma Le Colisée",
        "categorie": "Art", "jours_dans_futur": 16,
        "tags": ["documentaire", "festival"],
        "billets": [
            {"nom": "Pass journée", "prix": 20, "capacite": 250},
        ],
    },

    # SPORT (4)
    {
        "titre": "Marathon de Tunis 2026",
        "description": "Le rendez-vous des coureurs tunisiens. 5km, 10km, semi et marathon complet.",
        "ville": "Tunis", "lieu": "Avenue Habib Bourguiba",
        "categorie": "Sport", "jours_dans_futur": 25,
        "tags": ["marathon", "course"],
        "billets": [
            {"nom": "5 km", "prix": 25, "capacite": 2000},
            {"nom": "10 km", "prix": 35, "capacite": 1500},
            {"nom": "Semi-marathon", "prix": 50, "capacite": 800},
        ],
    },
    {
        "titre": "Tournoi de tennis amateur",
        "description": "Tournoi ouvert à tous les niveaux. Inscription en simple ou double.",
        "ville": "Sousse", "lieu": "Tennis Club de Sousse",
        "categorie": "Sport", "jours_dans_futur": 11,
        "tags": ["tennis", "tournoi"],
        "billets": [
            {"nom": "Inscription simple", "prix": 40, "capacite": 32},
            {"nom": "Inscription double", "prix": 70, "capacite": 16},
        ],
    },
    {
        "titre": "Stage de surf à Hammamet",
        "description": "3 jours d'initiation au surf avec moniteurs certifiés. Matériel inclus.",
        "ville": "Hammamet", "lieu": "Plage de Hammamet Nord",
        "categorie": "Sport", "jours_dans_futur": 18,
        "tags": ["surf", "stage", "plage"],
        "billets": [
            {"nom": "3 jours", "prix": 180, "capacite": 20, "bon_plan": True, "prix_original": 250},
        ],
    },
    {
        "titre": "Match d'ouverture Espérance vs CA",
        "description": "Le derby tunisien tant attendu au stade Olympique de Radès.",
        "ville": "Tunis", "lieu": "Stade Olympique de Radès",
        "categorie": "Sport", "jours_dans_futur": 4,
        "tags": ["football", "derby"],
        "billets": [
            {"nom": "Virage", "prix": 15, "capacite": 5000},
            {"nom": "Tribune", "prix": 35, "capacite": 3000},
            {"nom": "VIP", "prix": 100, "capacite": 200},
        ],
    },

    # THÉÂTRE (3)
    {
        "titre": "Pièce — Made in Tunisia",
        "description": "Comédie hilarante sur la société tunisienne d'aujourd'hui.",
        "ville": "Tunis", "lieu": "Théâtre municipal de Tunis",
        "categorie": "Théâtre", "jours_dans_futur": 6,
        "tags": ["comédie", "tunisien"],
        "billets": [
            {"nom": "Standard", "prix": 25, "capacite": 400},
            {"nom": "Premium", "prix": 45, "capacite": 100},
        ],
    },
    {
        "titre": "Théâtre pour enfants — Aladdin",
        "description": "Spectacle musical pour enfants à partir de 5 ans.",
        "ville": "Sousse", "lieu": "Théâtre municipal de Sousse",
        "categorie": "Théâtre", "jours_dans_futur": 9,
        "tags": ["enfants", "famille"],
        "billets": [
            {"nom": "Enfant", "prix": 15, "capacite": 250},
            {"nom": "Adulte", "prix": 25, "capacite": 150},
        ],
    },
    {
        "titre": "Stand-up comedy à Sfax",
        "description": "Soirée stand-up avec 5 humoristes tunisiens en vogue.",
        "ville": "Sfax", "lieu": "Comedy Club Sfax",
        "categorie": "Théâtre", "jours_dans_futur": 13,
        "tags": ["humour", "stand-up"],
        "billets": [
            {"nom": "Standard", "prix": 30, "capacite": 150, "bon_plan": True, "prix_original": 45},
        ],
    },

    # TECH (3)
    {
        "titre": "Tunisia Tech Conference 2026",
        "description": "La plus grande conférence tech de Tunisie. 50 speakers, 1000 participants.",
        "ville": "Tunis", "lieu": "Palais des Congrès",
        "categorie": "Tech", "jours_dans_futur": 22,
        "tags": ["conférence", "innovation"],
        "billets": [
            {"nom": "Early Bird", "prix": 120, "capacite": 200, "bon_plan": True, "prix_original": 200},
            {"nom": "Standard", "prix": 200, "capacite": 600},
            {"nom": "VIP + Networking", "prix": 350, "capacite": 100},
        ],
    },
    {
        "titre": "Hackathon Smart City Tunis",
        "description": "48h de code pour imaginer la ville de demain. Prix : 10 000 DT.",
        "ville": "Tunis", "lieu": "ISI - Institut Supérieur d'Informatique",
        "categorie": "Tech", "jours_dans_futur": 17,
        "tags": ["hackathon", "code"],
        "billets": [
            {"nom": "Participant", "prix": 0, "capacite": 100},
        ],
    },
    {
        "titre": "Meetup IA & Machine Learning",
        "description": "Conférences et démos sur l'IA générative. Networking et cocktail.",
        "ville": "La Marsa", "lieu": "Cogite La Marsa",
        "categorie": "Tech", "jours_dans_futur": 3,
        "tags": ["meetup", "ia"],
        "billets": [
            {"nom": "Entrée libre", "prix": 0, "capacite": 80},
        ],
    },

    # NIGHTLIFE (3)
    {
        "titre": "Soirée White Party à La Marsa",
        "description": "La soirée d'été incontournable. Dress code blanc, DJ international.",
        "ville": "La Marsa", "lieu": "Marina La Marsa",
        "categorie": "Nightlife", "jours_dans_futur": 8,
        "tags": ["soirée", "summer"],
        "billets": [
            {"nom": "Standard", "prix": 80, "capacite": 400},
            {"nom": "VIP Table", "prix": 500, "capacite": 30},
        ],
    },
    {
        "titre": "Beach Party Hammamet",
        "description": "Beach party tout l'après-midi avec DJs locaux et bar à cocktails.",
        "ville": "Hammamet", "lieu": "Plage Yasmine Hammamet",
        "categorie": "Nightlife", "jours_dans_futur": 5,
        "tags": ["beach", "été"],
        "billets": [
            {"nom": "Pass journée", "prix": 50, "capacite": 600, "bon_plan": True, "prix_original": 75},
        ],
    },
    {
        "titre": "Rooftop Sousse — DJ Set",
        "description": "Soirée chic sur rooftop avec vue mer et DJ résident.",
        "ville": "Sousse", "lieu": "Rooftop Movenpick",
        "categorie": "Nightlife", "jours_dans_futur": 2,
        "tags": ["rooftop", "élégant"],
        "billets": [
            {"nom": "Entrée", "prix": 40, "capacite": 200},
        ],
    },

    # BIEN-ÊTRE (2)
    {
        "titre": "Retraite Yoga à Sidi Bou Saïd",
        "description": "Weekend de yoga, méditation et alimentation saine face à la Méditerranée.",
        "ville": "Sidi Bou Saïd", "lieu": "Riad Sidi Bou Saïd",
        "categorie": "Bien-être", "jours_dans_futur": 12,
        "tags": ["yoga", "retraite"],
        "billets": [
            {"nom": "Weekend tout-inclus", "prix": 350, "capacite": 20},
        ],
    },
    {
        "titre": "Cours de pilates en plein air",
        "description": "Séance de pilates en plein air dans le parc de La Marsa. Pour tous niveaux.",
        "ville": "La Marsa", "lieu": "Parc de La Marsa",
        "categorie": "Bien-être", "jours_dans_futur": 3,
        "tags": ["pilates", "outdoor"],
        "billets": [
            {"nom": "Séance", "prix": 20, "capacite": 30},
        ],
    },

    # ======================================================
    #  NOUVEAUX ÉVÉNEMENTS (jeu de données enrichi)
    # ======================================================

    # --- MUSIQUE ---
    {
        "titre": "Concert symphonique — Orchestre de Tunis",
        "description": "Une soirée classique exceptionnelle avec l'Orchestre symphonique tunisien interprétant les grands maîtres.",
        "ville": "Tunis", "lieu": "Théâtre municipal de Tunis",
        "categorie": "Musique", "jours_dans_futur": 20,
        "tags": ["classique", "orchestre"],
        "billets": [
            {"nom": "Standard", "prix": 40, "capacite": 400},
            {"nom": "Premium", "prix": 90, "capacite": 60},
        ],
    },
    {
        "titre": "Nuit du Malouf à Sfax",
        "description": "Plongez dans le patrimoine musical tunisien avec une nuit dédiée au Malouf traditionnel.",
        "ville": "Sfax", "lieu": "Maison de la Culture de Sfax",
        "categorie": "Musique", "jours_dans_futur": 2,
        "tags": ["malouf", "patrimoine", "tunisien"],
        "billets": [
            {"nom": "Standard", "prix": 30, "capacite": 300, "bon_plan": True, "prix_original": 45},
        ],
    },

    # --- FOOD ---
    {
        "titre": "Festival gastronomique de Djerba",
        "description": "Découvrez les saveurs de la cuisine djerbienne à travers des dizaines de stands et d'ateliers culinaires.",
        "ville": "Djerba", "lieu": "Place Houmt Souk",
        "categorie": "Food", "jours_dans_futur": 25,
        "tags": ["gastronomie", "festival", "terroir"],
        "billets": [
            {"nom": "Entrée + dégustations", "prix": 35, "capacite": 500},
        ],
    },
    {
        "titre": "Atelier pâtisserie tunisienne",
        "description": "Apprenez à préparer les douceurs tunisiennes incontournables : baklawa, makroudh et kaâk warka.",
        "ville": "Sousse", "lieu": "Médina de Sousse",
        "categorie": "Food", "jours_dans_futur": 6,
        "tags": ["atelier", "patisserie"],
        "billets": [
            {"nom": "Participation", "prix": 55, "capacite": 25},
        ],
    },

    # --- ART ---
    {
        "titre": "Exposition d'art contemporain tunisien",
        "description": "Une sélection d'œuvres de jeunes artistes tunisiens explorant les thèmes de l'identité et de la modernité.",
        "ville": "Tunis", "lieu": "Galerie Le Violon Bleu",
        "categorie": "Art", "jours_dans_futur": 10,
        "tags": ["exposition", "contemporain"],
        "billets": [
            {"nom": "Entrée", "prix": 15, "capacite": 200},
        ],
    },
    {
        "titre": "Atelier de poterie à Nabeul",
        "description": "Initiez-vous à la poterie traditionnelle de Nabeul avec des artisans locaux.",
        "ville": "Nabeul", "lieu": "Centre artisanal de Nabeul",
        "categorie": "Art", "jours_dans_futur": 18,
        "tags": ["atelier", "artisanat", "poterie"],
        "billets": [
            {"nom": "Atelier", "prix": 40, "capacite": 20},
        ],
    },

    # --- SPORT ---
    {
        "titre": "Semi-marathon de Sousse 2026",
        "description": "Le grand semi-marathon annuel de Sousse : 21 km le long de la corniche et à travers la médina.",
        "ville": "Sousse", "lieu": "Corniche de Sousse",
        "categorie": "Sport", "jours_dans_futur": 30,
        "tags": ["marathon", "course", "outdoor"],
        "billets": [
            {"nom": "Inscription 21 km", "prix": 45, "capacite": 1500},
            {"nom": "Inscription 10 km", "prix": 25, "capacite": 1000},
        ],
    },
    {
        "titre": "Tournoi de beach-volley de Hammamet",
        "description": "Compétition amicale de beach-volley sur la plage de Hammamet, ouverte à tous les niveaux.",
        "ville": "Hammamet", "lieu": "Plage publique de Hammamet",
        "categorie": "Sport", "jours_dans_futur": 8,
        "tags": ["volley", "plage", "tournoi"],
        "billets": [
            {"nom": "Équipe (2 joueurs)", "prix": 30, "capacite": 64},
        ],
    },

    # --- THÉÂTRE ---
    {
        "titre": "Pièce de théâtre — « La Médina »",
        "description": "Une pièce contemporaine qui raconte la vie quotidienne dans la médina de Tunis à travers plusieurs générations.",
        "ville": "Tunis", "lieu": "Théâtre El Hamra",
        "categorie": "Théâtre", "jours_dans_futur": 4,
        "tags": ["theatre", "contemporain"],
        "billets": [
            {"nom": "Standard", "prix": 25, "capacite": 150},
        ],
    },
    {
        "titre": "Spectacle de marionnettes pour enfants",
        "description": "Un spectacle de marionnettes coloré et interactif qui ravira les plus petits.",
        "ville": "Sousse", "lieu": "Centre culturel de Sousse",
        "categorie": "Théâtre", "jours_dans_futur": 15,
        "tags": ["marionnettes", "enfants"],
        "billets": [
            {"nom": "Entrée", "prix": 12, "capacite": 120},
        ],
    },

    # --- CINÉMA ---
    {
        "titre": "Avant-première du cinéma tunisien",
        "description": "Projection en avant-première d'un long-métrage tunisien primé, suivie d'un débat avec le réalisateur.",
        "ville": "Tunis", "lieu": "CinéMadart Carthage",
        "categorie": "Cinéma", "jours_dans_futur": 9,
        "tags": ["cinema", "avant-premiere", "tunisien"],
        "billets": [
            {"nom": "Entrée", "prix": 18, "capacite": 250},
        ],
    },
    {
        "titre": "Nuit du cinéma d'horreur",
        "description": "Une nuit entière de films d'horreur cultes projetés sur grand écran. Frissons garantis !",
        "ville": "La Marsa", "lieu": "Pathé La Marsa",
        "categorie": "Cinéma", "jours_dans_futur": 22,
        "tags": ["cinema", "horreur", "nuit"],
        "billets": [
            {"nom": "Pass nuit", "prix": 30, "capacite": 180, "bon_plan": True, "prix_original": 45},
        ],
    },

    # --- TECH ---
    {
        "titre": "Hackathon Tunisia Digital 2026",
        "description": "48 heures de code non-stop pour développer des solutions innovantes. Prix pour les meilleures équipes.",
        "ville": "Tunis", "lieu": "Technopôle El Ghazala",
        "categorie": "Tech", "jours_dans_futur": 28,
        "tags": ["hackathon", "code", "innovation"],
        "billets": [
            {"nom": "Participation", "prix": 0, "capacite": 150},
        ],
    },
    {
        "titre": "Conférence Intelligence Artificielle",
        "description": "Une journée de conférences et d'ateliers sur l'IA et le machine learning, avec des experts tunisiens et internationaux.",
        "ville": "Sfax", "lieu": "Université de Sfax",
        "categorie": "Tech", "jours_dans_futur": 16,
        "tags": ["IA", "conference", "machine-learning"],
        "billets": [
            {"nom": "Étudiant", "prix": 20, "capacite": 200},
            {"nom": "Professionnel", "prix": 60, "capacite": 100},
        ],
    },

    # --- NIGHTLIFE ---
    {
        "titre": "Soirée électro à Gammarth",
        "description": "DJ sets internationaux dans l'un des clubs les plus réputés de la côte nord.",
        "ville": "La Marsa", "lieu": "Club Calypso Gammarth",
        "categorie": "Nightlife", "jours_dans_futur": 1,
        "tags": ["electro", "DJ", "club"],
        "billets": [
            {"nom": "Entrée", "prix": 40, "capacite": 400},
            {"nom": "Table VIP", "prix": 300, "capacite": 20},
        ],
    },

    # --- BIEN-ÊTRE ---
    {
        "titre": "Séance de méditation au lever du soleil",
        "description": "Une séance de méditation guidée face à la mer, au lever du soleil, pour bien commencer la journée.",
        "ville": "Monastir", "lieu": "Plage de Monastir",
        "categorie": "Bien-être", "jours_dans_futur": 5,
        "tags": ["meditation", "sunrise"],
        "billets": [
            {"nom": "Séance", "prix": 15, "capacite": 40},
        ],
    },

    # --- FAMILLE ---
    {
        "titre": "Journée en famille à Carthage Land",
        "description": "Une journée pleine d'attractions et d'animations pour toute la famille au parc Carthage Land.",
        "ville": "Hammamet", "lieu": "Carthage Land Hammamet",
        "categorie": "Famille", "jours_dans_futur": 11,
        "tags": ["famille", "parc", "enfants"],
        "billets": [
            {"nom": "Adulte", "prix": 35, "capacite": 500},
            {"nom": "Enfant", "prix": 20, "capacite": 500},
        ],
    },
    {
        "titre": "Atelier scientifique pour enfants",
        "description": "Des expériences amusantes et éducatives pour éveiller la curiosité scientifique des enfants.",
        "ville": "Tunis", "lieu": "Cité des Sciences de Tunis",
        "categorie": "Famille", "jours_dans_futur": 13,
        "tags": ["science", "enfants", "atelier"],
        "billets": [
            {"nom": "Enfant + accompagnateur", "prix": 25, "capacite": 60},
        ],
    },
    {
        "titre": "Chasse au trésor géante à Sousse",
        "description": "Une grande chasse au trésor à travers la médina de Sousse pour petits et grands.",
        "ville": "Sousse", "lieu": "Médina de Sousse",
        "categorie": "Famille", "jours_dans_futur": 19,
        "tags": ["famille", "jeu", "outdoor"],
        "billets": [
            {"nom": "Équipe (jusqu'à 5)", "prix": 50, "capacite": 40},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed la base avec 30 événements répartis dans plusieurs villes et catégories"

    def handle(self, *args, **options):
        # 1. Création des catégories
        self.stdout.write("\n📦 Création des catégories...")
        categories_map = {}
        for cat_data in CATEGORIES:
            cat, created = Categorie.objects.get_or_create(
                nom=cat_data["nom"],
                defaults={
                    "icone": cat_data["icone"],
                    "couleur": cat_data["couleur"],
                    "is_validee": True,
                },
            )
            categories_map[cat_data["nom"]] = cat
            status = "✓ Créée" if created else "  Existe déjà"
            self.stdout.write(f"  {status}: {cat.nom}")

        # 2. Trouver ou créer un organisateur de test
        organisateur, created = User.objects.get_or_create(
            email="organisateur@eventu.tn",
            defaults={
                "nom": "Eventu",
                "prenom": "Officiel",
                "role": "client",
                "is_active": True,
            },
        )
        if created:
            organisateur.set_password("Organisateur123!")
            organisateur.save()
            self.stdout.write(self.style.WARNING(
                f"\n👤 Organisateur de test créé : organisateur@eventu.tn / Organisateur123!"
            ))

        # 3. Création des événements
        self.stdout.write(f"\n🎉 Création de {len(EVENTS)} événements...\n")
        now = timezone.now()
        created_count = 0
        skipped_count = 0

        for event_data in EVENTS:
            # Vérifie si l'événement existe déjà (par titre)
            if Event.objects.filter(titre=event_data["titre"]).exists():
                skipped_count += 1
                self.stdout.write(f"  ⏭  Existe déjà : {event_data['titre']}")
                continue

            # Récupère les coordonnées de la ville
            lat, lng = COORDS.get(event_data["ville"], (None, None))

            # Calcule la date de l'événement
            date_event = now + timedelta(days=event_data["jours_dans_futur"], hours=19)

            # Crée l'événement
            event = Event.objects.create(
                titre=event_data["titre"],
                description=event_data["description"],
                date_evenement=date_event,
                lieu=event_data["lieu"],
                ville=event_data["ville"],
                latitude=Decimal(str(lat)) if lat else None,
                longitude=Decimal(str(lng)) if lng else None,
                categorie=categories_map[event_data["categorie"]],
                organisateur=organisateur,
                statut="publie",
                is_valide=True,
            )

            # Ajoute les tags
            for tag_name in event_data.get("tags", []):
                tag, _ = Tag.objects.get_or_create(
                    slug=slugify(tag_name),
                    defaults={"nom": tag_name},
                )
                event.tags.add(tag)

            # Crée les types de billets
            for index, billet in enumerate(event_data["billets"]):
                TypeBillet.objects.create(
                    event=event,
                    nom=billet["nom"],
                    prix=Decimal(str(billet["prix"])),
                    capacite=billet["capacite"],
                    is_bon_plan=billet.get("bon_plan", False),
                    prix_original=Decimal(str(billet["prix_original"])) if billet.get("prix_original") else None,
                    ordre=index,
                )

            event.update_capacite_et_prix()
            created_count += 1
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {event_data['categorie']:10} | {event_data['ville']:15} | {event_data['titre']}"
            ))

        # Récap
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Terminé : {created_count} événements créés, {skipped_count} ignorés"
        ))