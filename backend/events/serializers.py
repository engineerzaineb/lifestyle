from decimal import Decimal
from rest_framework import serializers
from django.utils.text import slugify
from .models import Event, Categorie, Tag, TypeBillet, Reservation, ReservationItem


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'slug', 'icone', 'couleur', 'is_validee']
        read_only_fields = ['slug', 'is_validee']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'nom', 'slug']
        read_only_fields = ['slug']


class TypeBilletSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeBillet
        fields = [
            'id', 'nom', 'description', 'prix',
            'is_bon_plan', 'prix_original', 'pourcentage_reduction',
            'capacite', 'ordre', 'places_restantes'
        ]
        read_only_fields = ['pourcentage_reduction', 'places_restantes']

    def validate(self, data):
        if data.get('is_bon_plan'):
            prix_original = data.get('prix_original')
            prix = data.get('prix')
            if not prix_original:
                raise serializers.ValidationError({
                    'prix_original': "Requis si le billet est un bon plan."
                })
            if prix_original <= prix:
                raise serializers.ValidationError({
                    'prix_original': "Doit être supérieur au prix actuel."
                })
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Pour la liste des événements (vue allégée)."""
    categorie = CategorieSerializer(read_only=True)
    organisateur_nom = serializers.CharField(source='organisateur_nom_complet', read_only=True)
    capacite_totale = serializers.IntegerField(read_only=True)
    prix_min = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    has_bon_plan = serializers.BooleanField(read_only=True)
    reduction_max = serializers.IntegerField(read_only=True)
    image_url = serializers.SerializerMethodField()

    # Stats organisateur
    vues = serializers.SerializerMethodField()
    inscriptions = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'titre', 'description', 'date_evenement',
            'lieu', 'ville', 'statut',
            'categorie', 'capacite_totale', 'prix_min',
            'has_bon_plan', 'reduction_max',
            'organisateur_nom', 'image_url', 'created_at',
            'motif_refus',
            'vues', 'inscriptions', 'revenue',
        ]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_vues(self, obj):
        return obj.vues_count

    def get_inscriptions(self, obj):
        return obj.inscriptions_count

    def get_revenue(self, obj):
        """Revenue exposé uniquement à l'organisateur ou à l'admin."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if request.user.role == 'admin' or obj.organisateur_id == request.user.id:
            return float(obj.revenue_total)
        return None


class EventDetailSerializer(serializers.ModelSerializer):
    """Pour la création / détail / mise à jour."""
    categorie = CategorieSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    types_billets = TypeBilletSerializer(many=True, read_only=True)

    categorie_slug = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    nouvelle_categorie = serializers.DictField(write_only=True, required=False, allow_null=True)
    tags_list = serializers.ListField(
        child=serializers.CharField(max_length=30),
        write_only=True, required=False
    )
    types_billets_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True, required=False
    )
    is_draft = serializers.BooleanField(write_only=True, required=False, default=False)

    completion_percentage = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()

    organisateur_nom = serializers.CharField(source='organisateur_nom_complet', read_only=True)
    capacite_totale = serializers.IntegerField(read_only=True)
    prix_min = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    # Stats organisateur
    vues = serializers.SerializerMethodField()
    inscriptions = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'titre', 'description', 'date_evenement',
            'lieu', 'ville', 'statut', 'image',
            'categorie', 'tags', 'types_billets',
            'capacite', 'prix', 'capacite_totale', 'prix_min',
            'organisateur', 'organisateur_nom', 'is_valide', 'motif_refus',
            'created_at', 'updated_at',
            'completion_percentage', 'missing_fields',
            'categorie_slug', 'nouvelle_categorie', 'tags_list',
            'types_billets_data', 'is_draft',
            'vues', 'inscriptions', 'revenue',
        ]
        read_only_fields = [
            'capacite', 'prix', 'is_valide', 'motif_refus',
            'created_at', 'updated_at', 'organisateur',
        ]

    def get_vues(self, obj):
        return obj.vues_count

    def get_inscriptions(self, obj):
        return obj.inscriptions_count

    def get_revenue(self, obj):
        """Revenue exposé uniquement à l'organisateur ou à l'admin."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if request.user.role == 'admin' or obj.organisateur_id == request.user.id:
            return float(obj.revenue_total)
        return None

    def get_completion_percentage(self, obj):
        if not obj.pk:
            return 0
        weights = {
            'titre': 15, 'description': 15, 'date_evenement': 15,
            'lieu': 10, 'ville': 10, 'categorie': 10,
            'types_billets': 20, 'image': 5,
        }
        checks = {
            'titre': bool(obj.titre),
            'description': bool(obj.description and len(obj.description) >= 20),
            'date_evenement': bool(obj.date_evenement),
            'lieu': bool(obj.lieu),
            'ville': bool(obj.ville),
            'categorie': bool(obj.categorie_id),
            'types_billets': obj.types_billets.exists(),
            'image': bool(obj.image),
        }
        score = sum(weights[k] for k, v in checks.items() if v)
        return min(score, 100)

    def get_missing_fields(self, obj):
        if not obj.pk:
            return []
        missing = []
        if not obj.titre:
            missing.append({'field': 'titre', 'label': 'Titre'})
        if not obj.description or len(obj.description) < 20:
            missing.append({'field': 'description', 'label': 'Description (min 20 caractères)'})
        if not obj.date_evenement:
            missing.append({'field': 'date_evenement', 'label': 'Date et heure'})
        if not obj.lieu:
            missing.append({'field': 'lieu', 'label': 'Lieu'})
        if not obj.ville:
            missing.append({'field': 'ville', 'label': 'Ville'})
        if not obj.categorie_id:
            missing.append({'field': 'categorie', 'label': 'Catégorie'})
        if not obj.types_billets.exists():
            missing.append({'field': 'types_billets', 'label': 'Au moins un type de billet'})
        if not obj.image:
            missing.append({'field': 'image', 'label': 'Image de couverture'})
        return missing

    def validate(self, attrs):
        is_draft = attrs.get('is_draft', False)

        if is_draft:
            if not attrs.get('titre') and not (self.instance and self.instance.titre):
                raise serializers.ValidationError({
                    'titre': "Le titre est obligatoire même pour un brouillon."
                })
        else:
            required = ['titre', 'description', 'date_evenement', 'lieu', 'ville']
            for field in required:
                value = attrs.get(field) or (self.instance and getattr(self.instance, field, None))
                if not value:
                    raise serializers.ValidationError({
                        field: f"Ce champ est obligatoire pour publier."
                    })
        return attrs

    def _resolve_categorie(self, validated_data, organisateur):
        slug = validated_data.pop('categorie_slug', None)
        nouvelle = validated_data.pop('nouvelle_categorie', None)

        if nouvelle:
            nom = nouvelle.get('nom', '').strip()
            couleur = nouvelle.get('couleur', '#4F46E5')
            if not nom:
                raise serializers.ValidationError({
                    'nouvelle_categorie': "Le nom est requis."
                })
            cat_slug = slugify(nom)
            cat, created = Categorie.objects.get_or_create(
                slug=cat_slug,
                defaults={
                    'nom': nom, 'couleur': couleur,
                    'icone': 'FolderPlus', 'is_validee': False,
                    'proposee_par': organisateur,
                }
            )
            return cat

        if slug:
            try:
                return Categorie.objects.get(slug=slug)
            except Categorie.DoesNotExist:
                return None
        return None

    def _resolve_tags(self, tags_list):
        tags = []
        for tag_name in tags_list or []:
            tag_name = tag_name.strip().lower()
            if tag_name:
                tag, _ = Tag.objects.get_or_create(
                    slug=slugify(tag_name),
                    defaults={'nom': tag_name}
                )
                tags.append(tag)
        return tags

    def _create_types_billets(self, event, types_billets_data):
        for index, billet_data in enumerate(types_billets_data or []):
            if not billet_data.get('nom'):
                continue
            TypeBillet.objects.create(
                event=event,
                nom=billet_data.get('nom', ''),
                description=billet_data.get('description', ''),
                prix=billet_data.get('prix') or 0,
                is_bon_plan=billet_data.get('is_bon_plan', False),
                prix_original=billet_data.get('prix_original') or None,
                capacite=billet_data.get('capacite') or 0,
                ordre=index,
            )

    def create(self, validated_data):
        organisateur = self.context['request'].user
        is_draft = validated_data.pop('is_draft', False)
        tags_list = validated_data.pop('tags_list', [])
        types_billets_data = validated_data.pop('types_billets_data', [])

        categorie = self._resolve_categorie(validated_data, organisateur)
        validated_data['categorie'] = categorie
        validated_data['organisateur'] = organisateur
        validated_data['statut'] = 'brouillon' if is_draft else 'en_attente'

        event = Event.objects.create(**validated_data)

        if tags_list:
            event.tags.set(self._resolve_tags(tags_list))

        if types_billets_data:
            self._create_types_billets(event, types_billets_data)
            event.update_capacite_et_prix()

        return event

    def update(self, instance, validated_data):
        organisateur = self.context['request'].user
        is_draft = validated_data.pop('is_draft', False)
        tags_list = validated_data.pop('tags_list', None)
        types_billets_data = validated_data.pop('types_billets_data', None)

        if 'categorie_slug' in validated_data or 'nouvelle_categorie' in validated_data:
            categorie = self._resolve_categorie(validated_data, organisateur)
            instance.categorie = categorie

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if is_draft:
            instance.statut = 'brouillon'
        elif instance.statut == 'brouillon':
            instance.statut = 'en_attente'

        instance.save()

        if tags_list is not None:
            instance.tags.set(self._resolve_tags(tags_list))

        if types_billets_data is not None:
            instance.types_billets.all().delete()
            self._create_types_billets(instance, types_billets_data)
            instance.update_capacite_et_prix()

        return instance


# ============================================================
# RÉSERVATIONS
# ============================================================

class ReservationItemReadSerializer(serializers.ModelSerializer):
    type_billet_nom = serializers.CharField(source='type_billet.nom', read_only=True)
    sous_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ReservationItem
        fields = ['id', 'type_billet', 'type_billet_nom', 'quantite', 'prix_unitaire', 'sous_total']


class ReservationItemCreateSerializer(serializers.Serializer):
    type_billet = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1, max_value=20)


class ReservationReadSerializer(serializers.ModelSerializer):
    event = EventListSerializer(read_only=True)
    items = ReservationItemReadSerializer(many=True, read_only=True)
    total_places = serializers.IntegerField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'code_reference', 'statut', 'total_prix', 'total_places',
            'date_reservation', 'date_annulation', 'motif_annulation',
            'event', 'items',
        ]


class ReservationCreateSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    items = ReservationItemCreateSerializer(many=True)

    def validate(self, attrs):
        try:
            event = Event.objects.get(pk=attrs['event_id'])
        except Event.DoesNotExist:
            raise serializers.ValidationError({'event_id': 'Événement introuvable.'})

        if event.statut != 'publie':
            raise serializers.ValidationError({'event_id': "Cet événement n'est pas ouvert à la réservation."})

        items = attrs.get('items', [])
        if not items:
            raise serializers.ValidationError({'items': 'Au moins un billet est requis.'})

        total_prix = Decimal('0')
        errors = []
        for item in items:
            try:
                tb = TypeBillet.objects.get(pk=item['type_billet'])
            except TypeBillet.DoesNotExist:
                errors.append(f"Type de billet {item['type_billet']} introuvable.")
                continue
            if tb.event_id != event.id:
                errors.append(f"Le billet {tb.nom} n'appartient pas à cet événement.")
                continue
            if item['quantite'] > tb.places_restantes:
                errors.append(f"Il ne reste que {tb.places_restantes} place(s) pour {tb.nom}.")
                continue
            total_prix += tb.prix * item['quantite']

        if errors:
            raise serializers.ValidationError({'items': errors})

        attrs['_event'] = event
        attrs['_total_prix'] = total_prix
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        event = validated_data['_event']
        total_prix = validated_data['_total_prix']
        items_data = validated_data['items']

        reservation = Reservation.objects.create(
            user=user,
            event=event,
            total_prix=total_prix,
            statut='confirmee',
        )
        for item in items_data:
            tb = TypeBillet.objects.get(pk=item['type_billet'])
            ReservationItem.objects.create(
                reservation=reservation,
                type_billet=tb,
                quantite=item['quantite'],
                prix_unitaire=tb.prix,
            )
        return reservation

    def to_representation(self, instance):
        return ReservationReadSerializer(instance, context=self.context).data