from scapy.all import sniff, IP, TCP, UDP, ICMP, DNS
import threading
import time
import random

import database
import detector

# Global flag to stop the thread gracefully
running = False

def process_packet(packet):
    """Callback function for every captured packet."""
    try:
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            length = len(packet)
            
            protocol = "Other"
            src_port = 0
            dst_port = 0
            
            if TCP in packet:
                protocol = "TCP"
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
                if dst_port == 80 or src_port == 80 or dst_port == 443 or src_port == 443:
                    protocol = "HTTP/HTTPS"
                    
            elif UDP in packet:
                protocol = "UDP"
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
                if DNS in packet or dst_port == 53 or src_port == 53:
                    protocol = "DNS"
                    
            elif ICMP in packet:
                protocol = "ICMP"

            # Create a simple summary 
            summary = packet.summary()
            
            # Log to DB (you might want to batch this in a production environment)
            database.insert_packet(src_ip, dst_ip, src_port, dst_port, protocol, length, summary)
            
            # Pass to detector
            detector.detect_anomalies(src_ip, dst_port, protocol, length)

    except Exception as e:
        print(f"Error processing packet: {e}")

def start_sniffing(interface=None):
    """Starts scapy sniff in a blocking manner."""
    global running
    running = True
    print(f"Starting real-time capture on {interface if interface else 'default interface'}...")
    try:
        # We catch packets forever until running is False (using stop_filter)
        sniff(iface=interface, prn=process_packet, store=False, stop_filter=lambda x: not running)
    except PermissionError:
        print("Permission denied to sniff on the network. Falling back to Simulated Demo mode.")
        start_simulation()
    except Exception as e:
        print(f"Failed to start sniffer: {e}. Falling back to Simulated Demo mode.")
        start_simulation()

def start_simulation():
    """Simulates network traffic for demonstration if live capture fails."""
    global running
    running = True
    print("Running in Simulated Demo Mode...")
    protocols = ["TCP", "UDP", "HTTP/HTTPS", "DNS", "ICMP"]
    internal_ips = ["192.168.1.10", "192.168.1.15", "192.168.1.20", "192.168.1.50"]
    external_ips = ["8.8.8.8", "1.1.1.1", "104.21.5.12", "142.250.190.46"]
    
    # A suspicious external IP to trigger alerts
    hacker_ip = "185.20.10.15"

    while running:
        # Generate normal traffic
        src = random.choice(internal_ips + external_ips)
        dst = random.choice(internal_ips + external_ips)
        if src == dst:
            dst = random.choice(external_ips)
            
        proto = random.choice(protocols)
        src_port = random.randint(1024, 65535)
        dst_port = random.choice([80, 443, 53, 22, 3306])
        length = random.randint(64, 1500)
        
        # 5% chance of simulating an anomaly
        if random.random() < 0.05:
            # Port Scan Sim
            src = hacker_ip
            dst_port = random.randint(1, 1024)
            proto = "TCP"
            
        if random.random() < 0.02:
            # DNS Flood Sim
            src = hacker_ip
            proto = "DNS"
            
        database.insert_packet(src, dst, src_port, dst_port, proto, length, f"Simulated {proto} packet")
        detector.detect_anomalies(src, dst_port, proto, length)
        
        # Pace the simulation
        time.sleep(random.uniform(0.01, 0.1))

def start_capture_thread():
    """Entry point for the web app to start the capture engine in the background."""
    thread = threading.Thread(target=start_sniffing, kwargs={'interface': None}, daemon=True)
    thread.start()
    return thread
