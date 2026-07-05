import yt_dlp

def download_youtube_as_mp3(video_url):
    # Configure settings for downloading best audio and converting to MP3
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192', # High-quality audio bitrate
        }],
        'outtmpl': '%(title)s.%(ext)s', # Saves file using the video title
    }
    
    try:
        print("Starting download and conversion... Please wait.")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        print("Success! Your MP3 file is ready.")
    except Exception as e:
        print(f"An error occurred: {e}")

# Replace this with your actual YouTube URL
video_link = "https://www.youtube.com/watch?v=d96vvf60jrQ"
download_youtube_as_mp3(video_link)

