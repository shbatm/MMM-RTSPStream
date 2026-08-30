#!/bin/bash
# Title         : MMM-RTSPStream preinstall script
# Description   : Installs X11 window-management helpers when needed.
#                 Skips devilspie2 and wmctrl on Wayland sessions.
#                 VLC or MPlayer must be installed separately for local playback.
# Author        : shbatm
# Date          : 2026-08-30
# Version       : 0.0.2
# Usage         : ./preinstall.sh
#==============================================================================


# Check for required Debian packages used by the X11 window manager.
required_packages=(devilspie2 wmctrl)
is_x11_session=false
case ${XDG_SESSION_TYPE:-} in
    x11)
        is_x11_session=true
        ;;
    wayland)
        ;;
    *)
        if [[ -n ${DISPLAY:-} && -z ${WAYLAND_DISPLAY:-} ]];
        then
            is_x11_session=true
        fi
        ;;
esac

if [[ $is_x11_session == true ]]
then
    if ! command -v dpkg-query >/dev/null 2>&1 || ! command -v apt-get >/dev/null 2>&1;
    then
        echo "X11 detected, but this installer supports Debian-based systems only." >&2
        echo "Install these packages manually: ${required_packages[*]}" >&2
        exit 1
    fi

    missing_packages=()
    for package in "${required_packages[@]}";
    do
        if [[ $(dpkg-query -W -f='${db:Status-Status}' "$package" 2>/dev/null) != "installed" ]];
        then
            missing_packages+=("$package")
        fi
    done

    if [[ ${#missing_packages[@]} -gt 0 ]]
    then
        if [[ $EUID -eq 0 ]];
        then
            apt_command=(apt-get)
        elif command -v sudo >/dev/null 2>&1;
        then
            apt_command=(sudo apt-get)
        else
            echo "X11 detected, but sudo is unavailable. Install these packages manually: ${missing_packages[*]}" >&2
            exit 1
        fi

        echo "X11 detected. Installing missing window-management helpers: ${missing_packages[*]}"
        if ! "${apt_command[@]}" update;
        then
            echo "Package list update failed. The X11 helpers were not installed." >&2
            exit 1
        fi
        if ! "${apt_command[@]}" install -y "${missing_packages[@]}";
        then
            echo "Package installation failed. Install these packages manually: ${missing_packages[*]}" >&2
            exit 1
        fi
        echo "X11 window-management helpers installed successfully."
    else
        echo "X11 detected. Window-management helpers are already installed."
    fi
else
    echo "No X11 session detected. Skipping devilspie2 and wmctrl."
    echo "This is expected for Wayland and WebRTC playback."
fi

echo ""
echo "Local playback requirements:"
echo "- VLC or MPlayer must be installed separately for local playback."
echo "- WebRTC playback does not require these X11 helper tools."

exit 0
