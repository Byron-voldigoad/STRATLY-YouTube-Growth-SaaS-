-- =============================================================
-- NERRA — Seed Data Scenarios
-- =============================================================

DO $$
DECLARE
  uid_a uuid; uid_b uuid; uid_c uuid; uid_d uuid; uid_e uuid;
  uid_f uuid; uid_g uuid; uid_h uuid; uid_i uuid; uid_j uuid;
  today date := current_date;
  now_ts timestamptz := now();
BEGIN
  -- 1. Récupération des UUIDs depuis auth.users
  SELECT id INTO uid_a FROM auth.users WHERE email = 'test-active@nerra.dev';
  SELECT id INTO uid_b FROM auth.users WHERE email = 'test-resistance@nerra.dev';
  SELECT id INTO uid_c FROM auth.users WHERE email = 'test-pilot@nerra.dev';
  SELECT id INTO uid_d FROM auth.users WHERE email = 'test-genesis@nerra.dev';
  SELECT id INTO uid_e FROM auth.users WHERE email = 'test-workshop@nerra.dev';
  SELECT id INTO uid_f FROM auth.users WHERE email = 'test-tension@nerra.dev';
  SELECT id INTO uid_g FROM auth.users WHERE email = 'test-cuisine@nerra.dev';
  SELECT id INTO uid_h FROM auth.users WHERE email = 'test-feedback@nerra.dev';
  SELECT id INTO uid_i FROM auth.users WHERE email = 'test-decline@nerra.dev';
  SELECT id INTO uid_j FROM auth.users WHERE email = 'test-multiniche@nerra.dev';

  -- 2. Insertion des Profils
  IF uid_a IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_a, 'test-active@nerra.dev', 'User Active', 'UC_A', 'GamingPro', 'pro')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_b IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_b, 'test-resistance@nerra.dev', 'User Resistance', 'UC_B', 'AnimeEdits', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_c IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_c, 'test-pilot@nerra.dev', 'User Pilot', 'UC_C', 'ContentCreator', 'pro')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_d IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_d, 'test-genesis@nerra.dev', 'User Genesis', 'UC_D', 'NewChannel', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_e IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_e, 'test-workshop@nerra.dev', 'User Workshop', 'UC_E', 'MidWorkshop', 'pro')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_f IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_f, 'test-tension@nerra.dev', 'User Tension', 'UC_F', 'TensionCreator', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_g IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_g, 'test-cuisine@nerra.dev', 'User Cuisine', 'UC_G', 'CuisineChannel', 'pro')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_h IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_h, 'test-feedback@nerra.dev', 'User Feedback', 'UC_H', 'RecentPublisher', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_i IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_i, 'test-decline@nerra.dev', 'User Decline', 'UC_I', 'DecliningChannel', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  IF uid_j IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, youtube_channel_id, youtube_channel_title, subscription_tier)
    VALUES (uid_j, 'test-multiniche@nerra.dev', 'User MultiNiche', 'UC_J', 'MultiNicheChannel', 'free')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, youtube_channel_id = EXCLUDED.youtube_channel_id, youtube_channel_title = EXCLUDED.youtube_channel_title, subscription_tier = EXCLUDED.subscription_tier;
  END IF;

  -- 3. Channel Analytics (3 points par channel sauf genesis)
  IF uid_a IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-0000000000a1', uid_a, 'UC_A', today - 30, 1400, 20000),
      ('11111111-0000-0000-0000-0000000000a2', uid_a, 'UC_A', today - 15, 1450, 25000),
      ('11111111-0000-0000-0000-0000000000a3', uid_a, 'UC_A', today, 1500, 30000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_b IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-0000000000b1', uid_b, 'UC_B', today - 30, 280, 5000),
      ('11111111-0000-0000-0000-0000000000b2', uid_b, 'UC_B', today - 15, 290, 5500),
      ('11111111-0000-0000-0000-0000000000b3', uid_b, 'UC_B', today, 300, 6000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_c IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-0000000000c1', uid_c, 'UC_C', today - 30, 700, 15000),
      ('11111111-0000-0000-0000-0000000000c2', uid_c, 'UC_C', today - 15, 750, 18000),
      ('11111111-0000-0000-0000-0000000000c3', uid_c, 'UC_C', today, 800, 20000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;
  
  -- skip D (Genesis)

  IF uid_e IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-0000000000e1', uid_e, 'UC_E', today - 30, 180, 2000),
      ('11111111-0000-0000-0000-0000000000e2', uid_e, 'UC_E', today - 15, 190, 2500),
      ('11111111-0000-0000-0000-0000000000e3', uid_e, 'UC_E', today, 200, 3000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_f IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-0000000000f1', uid_f, 'UC_F', today - 30, 580, 8000),
      ('11111111-0000-0000-0000-0000000000f2', uid_f, 'UC_F', today - 15, 590, 8500),
      ('11111111-0000-0000-0000-0000000000f3', uid_f, 'UC_F', today, 600, 9000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_g IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-000000000011', uid_g, 'UC_G', today - 30, 1900, 40000),
      ('11111111-0000-0000-0000-000000000012', uid_g, 'UC_G', today - 15, 1950, 45000),
      ('11111111-0000-0000-0000-000000000013', uid_g, 'UC_G', today, 2000, 50000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_h IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-000000000021', uid_h, 'UC_H', today - 30, 380, 4000),
      ('11111111-0000-0000-0000-000000000022', uid_h, 'UC_H', today - 15, 390, 4500),
      ('11111111-0000-0000-0000-000000000023', uid_h, 'UC_H', today, 400, 5000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_i IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-000000000031', uid_i, 'UC_I', today - 30, 1250, 15000),
      ('11111111-0000-0000-0000-000000000032', uid_i, 'UC_I', today - 15, 1220, 15500),
      ('11111111-0000-0000-0000-000000000033', uid_i, 'UC_I', today, 1200, 15800)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  IF uid_j IS NOT NULL THEN
    INSERT INTO channel_analytics (id, user_id, channel_id, date, subscribers, views)
    VALUES 
      ('11111111-0000-0000-0000-000000000041', uid_j, 'UC_J', today - 30, 480, 6000),
      ('11111111-0000-0000-0000-000000000042', uid_j, 'UC_J', today - 15, 490, 6500),
      ('11111111-0000-0000-0000-000000000043', uid_j, 'UC_J', today, 500, 7000)
    ON CONFLICT (channel_id, date) DO UPDATE SET subscribers = EXCLUDED.subscribers;
  END IF;

  -- 4. User Niches
  IF uid_a IS NOT NULL THEN
    INSERT INTO user_niches (id, user_id, channel_id, detected_niches)
    VALUES ('22222222-0000-0000-0000-0000000000a1', uid_a, 'UC_A', '["Gaming", "Let''s Play"]')
    ON CONFLICT (user_id, channel_id) DO UPDATE SET detected_niches = EXCLUDED.detected_niches;
  END IF;

  IF uid_g IS NOT NULL THEN
    INSERT INTO user_niches (id, user_id, channel_id, detected_niches)
    VALUES ('22222222-0000-0000-0000-000000000011', uid_g, 'UC_G', '["Cuisine", "Recettes"]')
    ON CONFLICT (user_id, channel_id) DO UPDATE SET detected_niches = EXCLUDED.detected_niches;
  END IF;
  
  -- J (MultiNiche) n'a pas de niche détectée, mais on ajoute la row
  IF uid_j IS NOT NULL THEN
    INSERT INTO user_niches (id, user_id, channel_id, detected_niches)
    VALUES ('22222222-0000-0000-0000-000000000041', uid_j, 'UC_J', '[]')
    ON CONFLICT (user_id, channel_id) DO UPDATE SET detected_niches = EXCLUDED.detected_niches;
  END IF;

  
  -- 5. Video Analytics (génération complète et réaliste)
  
  -- Variables locales pour les calculs réalistes
  DECLARE
    v_views int;
    v_duration int;
    v_ctr numeric;
    v_impressions int;
    v_watch_time int;
  BEGIN
    -- A: 20 vidéos
    IF uid_a IS NOT NULL THEN
      FOR i IN 1..20 LOOP
        v_views := floor(random() * 4800 + 200);
        v_duration := floor(random() * 600 + 300);
        v_ctr := round((random() * 8 + 2)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * (random() * 0.4 + 0.3))) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-000a-' || lpad(i::text, 12, '0') AS UUID),
          uid_a, 'UC_A', 'vid_a_' || i, 'Gaming Video ' || i, v_views, floor(v_views * 0.05), floor(v_views * 0.005), now_ts - (i * 9 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/a' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- B: 10 vidéos
    IF uid_b IS NOT NULL THEN
      FOR i IN 1..10 LOOP
        v_views := floor(random() * 1000 + 100);
        v_duration := floor(random() * 300 + 120);
        v_ctr := round((random() * 5 + 1)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.35)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-000b-' || lpad(i::text, 12, '0') AS UUID),
          uid_b, 'UC_B', 'vid_b_' || i, 'Anime Edit ' || i, v_views, floor(v_views * 0.08), floor(v_views * 0.01), now_ts - (i * 15 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/b' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- C: 15 vidéos
    IF uid_c IS NOT NULL THEN
      FOR i IN 1..15 LOOP
        v_views := floor(random() * 3000 + 500);
        v_duration := floor(random() * 900 + 300);
        v_ctr := round((random() * 6 + 3)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.5)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-000c-' || lpad(i::text, 12, '0') AS UUID),
          uid_c, 'UC_C', 'vid_c_' || i, 'Content Video ' || i, v_views, floor(v_views * 0.06), floor(v_views * 0.008), now_ts - (i * 12 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/c' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- E: 5 vidéos
    IF uid_e IS NOT NULL THEN
      FOR i IN 1..5 LOOP
        v_views := floor(random() * 800 + 100);
        v_duration := floor(random() * 600 + 200);
        v_ctr := round((random() * 4 + 2)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.4)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-000e-' || lpad(i::text, 12, '0') AS UUID),
          uid_e, 'UC_E', 'vid_e_' || i, 'Workshop Video ' || i, v_views, floor(v_views * 0.04), floor(v_views * 0.005), now_ts - (i * 20 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/e' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- F: 12 vidéos
    IF uid_f IS NOT NULL THEN
      FOR i IN 1..12 LOOP
        v_views := floor(random() * 1500 + 200);
        v_duration := floor(random() * 500 + 300);
        v_ctr := round((random() * 5 + 2)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.35)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-000f-' || lpad(i::text, 12, '0') AS UUID),
          uid_f, 'UC_F', 'vid_f_' || i, 'Tension Video ' || i, v_views, floor(v_views * 0.05), floor(v_views * 0.005), now_ts - (i * 14 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/f' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- G: 25 vidéos
    IF uid_g IS NOT NULL THEN
      FOR i IN 1..25 LOOP
        v_views := floor(random() * 8000 + 1000);
        v_duration := floor(random() * 1200 + 600);
        v_ctr := round((random() * 9 + 4)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.6)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-0011-' || lpad(i::text, 12, '0') AS UUID),
          uid_g, 'UC_G', 'vid_g_' || i, 'Recette Cuisine ' || i, v_views, floor(v_views * 0.07), floor(v_views * 0.01), now_ts - (i * 7 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/g' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- H: 8 vidéos
    IF uid_h IS NOT NULL THEN
      FOR i IN 1..8 LOOP
        v_views := floor(random() * 1200 + 200);
        v_duration := floor(random() * 700 + 300);
        v_ctr := round((random() * 5 + 2)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.4)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-0012-' || lpad(i::text, 12, '0') AS UUID),
          uid_h, 'UC_H', 'vid_h_' || i, 'Feedback Video ' || i, v_views, floor(v_views * 0.04), floor(v_views * 0.005), now_ts - (i * 18 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/h' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- I: 18 vidéos (déclin)
    IF uid_i IS NOT NULL THEN
      FOR i IN 1..18 LOOP
        v_views := floor(150 + ((18-i) * 50));
        v_duration := floor(random() * 600 + 300);
        v_ctr := round((1.5 + ((18-i) * 0.1))::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.3)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-0013-' || lpad(i::text, 12, '0') AS UUID),
          uid_i, 'UC_I', 'vid_i_' || i, 'Decline Video ' || i, v_views, floor(v_views * 0.03), floor(v_views * 0.002), now_ts - interval '45 days' - (i * 5 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/i' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;

    -- J: 15 vidéos mélangées
    IF uid_j IS NOT NULL THEN
      FOR i IN 1..15 LOOP
        v_views := floor(random() * 2000 + 100);
        v_duration := floor(random() * 800 + 200);
        v_ctr := round((random() * 7 + 1)::numeric, 2);
        v_impressions := floor(v_views / (v_ctr / 100));
        v_watch_time := floor((v_views * (v_duration * 0.45)) / 60);
        
        INSERT INTO video_analytics (id, user_id, channel_id, video_id, video_title, views, likes, comments, published_at, impressions, click_through_rate, duration_seconds, watch_time_minutes, thumbnail_url)
        VALUES (
          CAST('33333333-0000-0000-0014-' || lpad(i::text, 12, '0') AS UUID),
          uid_j, 'UC_J', 'vid_j_' || i, 
          CASE i % 4 
            WHEN 0 THEN 'Gaming Let''s Play ' || i 
            WHEN 1 THEN 'Recette Végétarienne ' || i 
            WHEN 2 THEN 'Vlog Voyage ' || i 
            ELSE 'Cover Guitare ' || i 
          END,
          v_views, floor(v_views * 0.05), floor(v_views * 0.005), now_ts - (i * 10 || ' days')::interval, v_impressions, v_ctr, v_duration, v_watch_time, 'https://picsum.photos/seed/j' || i || '/320/180'
        ) ON CONFLICT (video_id) DO UPDATE SET views = EXCLUDED.views, impressions = EXCLUDED.impressions, click_through_rate = EXCLUDED.click_through_rate, duration_seconds = EXCLUDED.duration_seconds, watch_time_minutes = EXCLUDED.watch_time_minutes, likes = EXCLUDED.likes, comments = EXCLUDED.comments;
      END LOOP;
    END IF;
  END;
  
-- 6. Decisions
  -- B: 3 skipped (resistance sur FORMAT)
  IF uid_b IS NOT NULL THEN
    INSERT INTO decisions (id, user_id, channel_id, experiment_type, hypothesis, variable, target_metric, verdict, is_resistance_confirmed, created_at)
    VALUES 
      ('44444444-0000-0000-0000-0000000000b1', uid_b, 'UC_B', 'TYPE_FORMAT', 'Hypo 1', 'Var 1', 'engagement_rate', 'SKIPPED', true, now_ts - interval '3 days'),
      ('44444444-0000-0000-0000-0000000000b2', uid_b, 'UC_B', 'TYPE_FORMAT', 'Hypo 2', 'Var 2', 'engagement_rate', 'SKIPPED', true, now_ts - interval '2 days'),
      ('44444444-0000-0000-0000-0000000000b3', uid_b, 'UC_B', 'TYPE_FORMAT', 'Hypo 3', 'Var 3', 'engagement_rate', 'SKIPPED', true, now_ts - interval '1 days')
    ON CONFLICT (id) DO UPDATE SET verdict = EXCLUDED.verdict;
  END IF;

  -- C: 14 VALIDATED (Pilot)
  IF uid_c IS NOT NULL THEN
    FOR i IN 1..14 LOOP
      INSERT INTO decisions (id, user_id, channel_id, experiment_type, hypothesis, variable, target_metric, verdict, created_at, mode)
      VALUES (
        CAST('44444444-0000-0000-0000-0000000000c' || to_hex(i) AS UUID),
        uid_c, 'UC_C', 'TYPE_TITRE', 'Hypo', 'Var', 'ctr', 'VALIDATED', now_ts - (i || ' days')::interval, 'PILOT'
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- E: MidWorkshop
  IF uid_e IS NOT NULL THEN
    INSERT INTO decisions (id, user_id, channel_id, experiment_type, hypothesis, variable, target_metric, verdict, workshop_step, selected_concept, selected_title, accepted_at)
    VALUES 
      ('44444444-0000-0000-0000-0000000000e1', uid_e, 'UC_E', 'TYPE_HOOK', 'Hypo Hook', 'Var Hook', 'watch_time_30s', 'PENDING', 3, 'Concept A', 'Mon Titre', now_ts)
    ON CONFLICT (id) DO UPDATE SET workshop_step = EXCLUDED.workshop_step;
  END IF;

  -- F: Tension (4 skipped sur TYPE_FORMAT il y a longtemps)
  IF uid_f IS NOT NULL THEN
    INSERT INTO decisions (id, user_id, channel_id, experiment_type, hypothesis, variable, target_metric, verdict, is_resistance_confirmed, created_at)
    VALUES 
      ('44444444-0000-0000-0000-0000000000f1', uid_f, 'UC_F', 'TYPE_FORMAT', 'H1', 'V1', 'engagement', 'SKIPPED', true, now_ts - interval '64 days'),
      ('44444444-0000-0000-0000-0000000000f2', uid_f, 'UC_F', 'TYPE_FORMAT', 'H2', 'V2', 'engagement', 'SKIPPED', true, now_ts - interval '63 days'),
      ('44444444-0000-0000-0000-0000000000f3', uid_f, 'UC_F', 'TYPE_FORMAT', 'H3', 'V3', 'engagement', 'SKIPPED', true, now_ts - interval '62 days'),
      ('44444444-0000-0000-0000-0000000000f4', uid_f, 'UC_F', 'TYPE_FORMAT', 'H4', 'V4', 'engagement', 'SKIPPED', true, now_ts - interval '61 days'),
      ('44444444-0000-0000-0000-0000000000f5', uid_f, 'UC_F', 'TYPE_TITRE', 'H5', 'V5', 'ctr', 'FAILED', false, now_ts - interval '10 days')
    ON CONFLICT (id) DO UPDATE SET verdict = EXCLUDED.verdict;
  END IF;

  -- H: RecentPublisher (accepted, with video_id, 2 days ago)
  IF uid_h IS NOT NULL THEN
    INSERT INTO decisions (id, user_id, channel_id, experiment_type, hypothesis, variable, target_metric, verdict, video_id, accepted_at)
    VALUES 
      ('44444444-0000-0000-0000-000000000021', uid_h, 'UC_H', 'TYPE_MINIATURE', 'H1', 'V1', 'ctr', 'PENDING', 'vid_pub_h1', now_ts - interval '2 days')
    ON CONFLICT (id) DO UPDATE SET video_id = EXCLUDED.video_id;
  END IF;

END $$;

-- =============================================================
-- CLEAN SEEDS (décommenter pour nettoyer)
-- =============================================================
-- DELETE FROM decisions WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%@nerra.dev');
-- DELETE FROM video_analytics WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%@nerra.dev');
-- DELETE FROM user_niches WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%@nerra.dev');
-- DELETE FROM channel_analytics WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE 'test-%@nerra.dev');
-- DELETE FROM profiles WHERE email LIKE 'test-%@nerra.dev';
-- Note: to delete auth users, you must use the Supabase dashboard or API,
-- or delete from auth.users directly if you have permission (not recommended via API).
