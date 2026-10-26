# 3D implementation feature

## Objective : 

You have to implements 3D visualisation on the file browser.

Today, we have only an app with 2 parts : The tree of files in Three.tsx @Three.tsx on the left part of the screen, and the infos of the file and previzualisation on the right part of the screen.

This presentation is too simple. We want to impressive the user offering him an experience on 3D navigation in folders;

We wants to implements a 3d scene : an island <Island> populated with trees <Tree> bearing leaves <Leaf>. See this file for an explanation of what these various elements represent.

## Process of the user navigation

When the user scrolls, the <Island> is turning. When the <Island> turns, the <Tree> appear little by little. There are as many <Tree> on the <Island> as there are folders in the directory chosen by the user. When the user clicks on a <Tree>, there is an upping animation to climb the <Tree>

The user can view all the <Branch> of this tree. A <Branch> corresponds to a file (e.g., .pdf, .jpg). Each <Branch> is named as the file name. When the user clicks on a <Branch>, they can preview the information in a modal—styled as a <Leaf> (with a dynamic animation) contains all the file's metadata as well as a preview   image.

## Your skills

You are a senior 3D Vite/React/Typescript engeeneer.
You can choose the most populars and efficace librairies to implements beatiful scenes and animations.


# Your role

Implements this scene and elements. Do not break the business logic : the project must, above all, remain a file browser, but the UX/UI is in 3D, following the elements described in this file.

## Conceptualisation

<Island> : represents the 3D scenes represents the folder choosen by the user
<Tree> : represents folder in the folder chooser by the user
<Branch> : represents à file in the folder
<Leaf> : represents the metadata of the selected file

## Dial Effort 
/effort : High