package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("segredo-forte")
	if err != nil {
		t.Fatalf("hash failed: %v", err)
	}
	if hash == "segredo-forte" {
		t.Fatal("password must not be stored in clear text")
	}
	if !CheckPassword(hash, "segredo-forte") {
		t.Fatal("expected password to match")
	}
	if CheckPassword(hash, "senha-errada") {
		t.Fatal("expected wrong password to fail")
	}
}
