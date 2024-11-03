## What is Bolt?

Upload videos to generate detailed notes instantly, with clickable timestamps for quick access to the most important moments in meetings or lectures.

## Inspiration

Learning material in college can be challenging, and sifting through Panopto VODs to find the information you need can be tedious and stressful. This pain point led us to create Bolt, a multimedia tool that skips all the needless video scrubbing.

## What it does

Bolt is a web application that allows users to generate notes that serve as clickable timestamps for lightning-fast video scrubbing.

## How we built it

We built the application with React and used Supabase to handle our data. After retrieving VODs from Supabase, we used OpenAI's Whisper and GPT4 to transcribe the videos and generate the notes structure.

## Challenges we ran into

A few challenges we ran into include:

- Implementing Google OAuth
- Handling the authorization policies and working with Supabase
- Developing the notes pipeline

## Accomplishments that we're proud of

Developing the notes architecture was what we felt was the feat of this project. It was pretty cool to be able to hover on a note and just click it, enabling a seamless augmentation of text with video.

## What we learned

- Google OAuth is infinitely easier to set up through Supabase
- MP4 to MP3 is more challenging than we thought
- Making multiple branches is best practice for a reason...

## What's next for Bolt

Future features will possibly include:

- Zoom support with automatic uploads after meetings
- Editable notes
- Chat functionality
