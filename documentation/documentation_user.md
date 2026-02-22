# EpiTrello – Guide Utilisateur

## Objectif du document

Ce document explique comment utiliser EpiTrello du point de vue d’un utilisateur.
Il présente les principales fonctionnalités de l’application et décrit, étape par étape,
comment les utiliser.

## 1. Présentation

EpiTrello est une application de gestion de tâches inspirée de Trello.  
Elle permet d’organiser le travail sous forme de **boards** (tableaux),
**lists** (listes) et **cards** (cartes / tickets).

Exemples d’usage :
- suivi de projet
- todo perso
- répartition de tâches dans une équipe

---

## 2. Accès et connexion

### 2.1. Accéder à l’application

- URL de l’application locale : **["http://localhost:5173"]**
- URL de l'application déployé : **["https://epitrello-v86y.onrender.com/"]**

### 2.2. Connexion

- Cliquez sur le bouton **"Login"** en haut à droite.
- Vous avez la possibilite de cree un compte ou bien de vous connecter via SSO avec github/microsoft
- Une fois connecté, vous accedez a votre profil.

> 💡 Si vous vous déconnectez, vos boards restent enregistrés en base.  
> Vous les retrouverez à la prochaine connexion avec le même compte.

---

## 3. Concepts de base

- **Board** : un tableau de projet (ex : "Projet EIP", "Révisions examens").
- **List** : une colonne dans un board (ex : "To do", "IN progress", "DONE").
- **Card** : une tâche ou un ticket dans une liste (ex : "Implémenter login").

---

## 4. Prendre en main un board

### 4.1. Créer un nouveau board

1. Depuis la page d’accueil(profil) / le header, cliquez sur **"Create"**.
2. une fenetre s'ouvre dans laquelle vous pouvez indiquez le nom du board ainsi que des suggestion templaté
2. Donnez un **nom au board** (ex : *board-test*).
3. Validez. Vous êtes redirigé vers la page du board.

### 4.2. Renommer un board

1. En haut de la page du board, cliquez dans le **titre du board**.
2. Modifiez le texte.
3. Cliquez en dehors du champ : le nom est **enregistré automatiquement**.

---

## 5. Gérer les listes

### 5.1. Ajouter une liste

1. Sur le board, à droite des listes existantes, utilisez le bloc **"New list name…"**.
2. Saisissez le nom (ex : *Backlog*, *À faire*, etc.).
3. Cliquez sur **"+ Add List"**.

### 5.2. Renommer une liste

- Cliquez dans le titre de la liste, modifiez le texte.
- Le nom est sauvegardé dès que vous quittez le champ.

### 5.3. Supprimer une liste

- Cliquez sur **"X"** en haut à droite de la liste.
- La liste et toutes ses cartes associées sont supprimées de l’interface
  et de la base de données.

> ⚠️ Cette action est définitive (pas d’historique / corbeille).

---

## 6. Gérer les cartes (cards)

### 6.1. Ajouter une carte

1. En bas d’une liste, dans le champ **"New card title…"**, tapez le titre de la carte.
2. Cliquez sur **"+ Add"**.
3. La nouvelle carte apparaît immédiatement dans la liste.

### 6.2. Renommer une carte (titre)

- Cliquez dans le titre de la carte.
- Modifiez le texte.
- Le nom est sauvegardé dès que vous quittez le champ.

### 6.3. Déplacer une carte entre les listes

- Pour deplacer une carte entre les listes vous pouvez simplement drag and drop la card d'une liste a une autre
- vous verrez un espace delimitant la zone dans laquelle vous pouvez placer votre carte
- Le changement de liste est immédiatement synchronisé avec la base.

### 6.4. Supprimer une carte

- Cliquez sur **"X"** en haut a droite de la carte.
- La carte est retirée de la liste et supprimée en base, ainsi que ses tags.

---

## 7. Panneau de détails d’une carte

En cliquant sur une carte, un **panneau de détails** s’ouvre au centre de l’écran.

Ce panneau contient plusieurs sections :

### 7.1. En-tête

- **Titre de la carte** (modifiable grace a la zone de texte).
- Indication de la liste a laquelle appartient la carte ex: *"in list X"*

### 7.2. Members (assignation)

- Dans la section **MEMBERS**, faite defiler menu  deroulant pour trouver le membre que vous voulez ajouter 
- Cliquez sur le bouton **"+ Join"** (ou équivalent)
  pour l'ajouter comme membre de la carte.
- Cliquez sur le petit bouton **"X"** dans le badge a droite pour le retirer.
- Les membres sont enregistrés en base et réapparaissent à la réouverture du panneau.

### 7.3. Description

- Dans la section **DESCRIPTION**, entrez un texte décrivant la tâche.
- Quand vous quittez le panneau de details de la carte, la description est envoyée à l’API
  et stockée dans la DB.
- En rouvrant la carte, la description précédemment saisie est rechargée.

Exemples d’usage :
- contexte de la tâche
- liens utiles
- check-list textuelle rapide

### 7.4. Due date

- La section **Due date** est prévue pour preciser une date limite pour votre tache.
- Lorsque vous cliquez sur la zone de texte il est possible de mettre a jour chaque element de la date JJ/MM/YYYY mais si vous clique sur l'icone calendrier vous verrez s'ouvrire le calendrier pour pouvoir selectionner la date precise a l'aquelle vous voulez assigne la tache.
- Ensuite cliquez sur **set** pour ajouter cette date et l'affecter a la carte
- Cliquez sur le petit bouton **"X"** dans le badge a droite pour la retirer.

---

## 7.5 Tags (étiquettes)

Les tags permettent de catégoriser les cartes (priorité, type, statut secondaire…).

1. Dans la section **TAGS**, saisissez un texte dans **"Ajouter un tag…"**.
2. Cliquez sur **"+ Tag"**.
3. Le tag apparaît sous forme de badge coloré, et est sauvegardé en base.
4. Cliquez sur le petit bouton **"X** dans le badge a droite pour le retirer.

## 7.6 autre

- Sur le panneau de details de la carte pous pouvez supprimer une carte aussi en cliquant sur **Delete**
- Vous pouvez fermer ce panneau pour le masquer en cliquand sur la croix **X** en haut a droite
---

## 8. Navigation et recherche

### 8.1. Barre de recherche utilisateurs

- En haut du board, une barre de recherche [SearchBoard] permet de rechercher un Board rapidement
- Lorsqu'on clique sur un board on peut donc basculer sur un autre de nos board rapidement sans avoir a retourner au profil

### 8.2. Activity (Historique)

- Dans le board cliquez sur **Activity**
- Une fenetre souvre dans lequel vous pourrez  voir un historique de toute les modifications qui ont ete apporte depuis la creation du board
- vous pouvez voir: l'action qui a ete faite, la card sur laquelle ca a ete faite, l'auteur, la date et l'heure a laquelle ce modification on ete mis en place
- Si vous cliquez sur **refresh** l'historique va etre recharge pour etre a jour
- Cliquez sur la croix **X** pour fermez cette fenetre 

### 8.3. Filtres

- Dans le Board vous pouvez cliquer sur **filter**
- Un bandeau s'affiche sur lequelle vous pouvez modifier les option de filtre notement: les assigne, la due date,  les tags.
- Le boutton **Reset** sert a reinitialiser le filtrage
- Si vous recliquez sur **filter** le bandeau disparait

### 8.3. Notification

- Sur le board cliquez sur **notification** 
- Une fenetre s'affiche sur laquelle vous pouvez voir des notifaications
- Une notifications peut apparaitre par example lorsque vous depasser la date limite d'une due date celle-ci vous previendra que la carte arrive a son terme

---

## 9. User and roles/permissions/acces

###  9.1 role: owner
#### 9.1.1 Board setting ()

- Sur le board cliquer sur board setting
- Vous pouvez a present consulter toute les informations du board
- La premiere section vous permet de modifier le nom du board et de save avec le boutton
- La deuxieme section vous permet de voir les innformations relatif au board notement: l'id, le user, l'owner, le nb de list, et le theme
- La troisieme section permet de gere les autre utilisateur, c'est grace a cette section que vous pouvez inviter un autre utilisateur. Pour se faire il suffit de copier le lien d'invitation et l'autre utilisateur connecter colle ce lien d'invitation sur le navigateur et sera directement ejouter au board
- Toujours dans la troisieme section vous pouvez modifier les permission des nouvaux utilisateur par default
- Enfin vous pouvez aussi voir la liste des membres pour modifier directement les permissions a in membre en particuier ou le supprimer du board
- La quatrieme et derniere sections vous permet de supprimer directement le board ainsi que toute ses elements attaché tel que les listes/cartes.

---
